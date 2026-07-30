package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/audit"
	"github.com/alemedu/api/internal/middleware"
	"github.com/alemedu/api/internal/utils"
)

// AdminReportsHandler يغطي تقارير التشغيل، بلاغات المحتوى، وسجل التدقيق
// (docs/product-requirements.md §7-8: مؤشرات نجاح المنتج وجودة المحتوى).
type AdminReportsHandler struct {
	db *pgxpool.Pool
}

func NewAdminReportsHandler(db *pgxpool.Pool) *AdminReportsHandler {
	return &AdminReportsHandler{db: db}
}

// Overview مؤشرات تشغيل أساسية: عدد الطلاب، الأسئلة حسب الحالة، البلاغات المفتوحة،
// الأسئلة ذات نسبة الخطأ غير الطبيعية، الاختبارات غير المكتملة.
func (h *AdminReportsHandler) Overview(c *fiber.Ctx) error {
	ctx := c.Context()

	var totalStudents int
	_ = h.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM users u JOIN user_roles ur ON ur.user_id = u.id
		JOIN roles r ON r.id = ur.role_id WHERE r.name = 'student' AND u.deleted_at IS NULL
	`).Scan(&totalStudents)

	questionsByStatus := map[string]int{}
	rows, err := h.db.Query(ctx, `SELECT status, COUNT(*) FROM questions GROUP BY status`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var status string
			var count int
			if rows.Scan(&status, &count) == nil {
				questionsByStatus[status] = count
			}
		}
	}

	var openReports int
	_ = h.db.QueryRow(ctx, `SELECT COUNT(*) FROM question_reports WHERE status = 'open'`).Scan(&openReports)

	var highErrorQuestions int
	_ = h.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM (
			SELECT aa.question_id,
			       COUNT(*) FILTER (WHERE aa.is_correct = false)::float / COUNT(*) AS error_rate
			FROM attempt_answers aa
			GROUP BY aa.question_id
			HAVING COUNT(*) >= 5
		) t WHERE t.error_rate >= 0.7
	`).Scan(&highErrorQuestions)

	var incompleteAttempts int
	_ = h.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM attempts WHERE status = 'in_progress' AND started_at < now() - interval '1 day'
	`).Scan(&incompleteAttempts)

	var avgScore *float64
	_ = h.db.QueryRow(ctx, `SELECT AVG(score) FROM attempt_results`).Scan(&avgScore)

	return c.JSON(fiber.Map{
		"totalStudents":           totalStudents,
		"questionsByStatus":       questionsByStatus,
		"openContentReports":      openReports,
		"highErrorQuestions":      highErrorQuestions,
		"staleIncompleteAttempts": incompleteAttempts,
		"averageScore":            avgScore,
	})
}

type contentIssueDTO struct {
	ID           string `json:"id"`
	QuestionID   string `json:"questionId"`
	QuestionBody string `json:"questionBody"`
	Reason       string `json:"reason"`
	Status       string `json:"status"`
	CreatedAt    string `json:"createdAt"`
}

// ListContentIssues بلاغات الطلاب/المراجعين عن مشاكل في الأسئلة (docs/database-design.md: question_reports).
func (h *AdminReportsHandler) ListContentIssues(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.Context(), `
		SELECT qr.id, qr.question_id, qv.body, qr.reason, qr.status, qr.created_at::text
		FROM question_reports qr
		JOIN questions q ON q.id = qr.question_id
		JOIN question_versions qv ON qv.question_id = q.id AND qv.version_number = q.current_version
		ORDER BY qr.status = 'open' DESC, qr.created_at DESC
		LIMIT 200
	`)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب البلاغات")
	}
	defer rows.Close()

	issues := []contentIssueDTO{}
	for rows.Next() {
		var i contentIssueDTO
		if err := rows.Scan(&i.ID, &i.QuestionID, &i.QuestionBody, &i.Reason, &i.Status, &i.CreatedAt); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة البلاغات")
		}
		issues = append(issues, i)
	}
	return c.JSON(issues)
}

func (h *AdminReportsHandler) ResolveContentIssue(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	id := c.Params("id")
	tag, err := h.db.Exec(c.Context(), `
		UPDATE question_reports SET status = 'resolved', resolved_at = now() WHERE id = $1 AND status = 'open'
	`, id)
	if err != nil || tag.RowsAffected() == 0 {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "البلاغ غير موجود أو مُعالَج بالفعل")
	}
	audit.Log(c.Context(), h.db, userID, "content_issue.resolve", "question_report", id, nil)
	return c.JSON(fiber.Map{"status": "resolved"})
}

type auditLogDTO struct {
	ID         string `json:"id"`
	ActorEmail string `json:"actorEmail,omitempty"`
	Action     string `json:"action"`
	EntityType string `json:"entityType"`
	EntityID   string `json:"entityId,omitempty"`
	CreatedAt  string `json:"createdAt"`
}

func (h *AdminReportsHandler) ListAuditLogs(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.Context(), `
		SELECT al.id, COALESCE(u.email, ''), al.action, al.entity_type,
		       COALESCE(al.entity_id::text, ''), al.created_at::text
		FROM audit_logs al
		LEFT JOIN users u ON u.id = al.actor_id
		ORDER BY al.created_at DESC
		LIMIT 200
	`)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب سجل التدقيق")
	}
	defer rows.Close()

	logs := []auditLogDTO{}
	for rows.Next() {
		var l auditLogDTO
		if err := rows.Scan(&l.ID, &l.ActorEmail, &l.Action, &l.EntityType, &l.EntityID, &l.CreatedAt); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة سجل التدقيق")
		}
		logs = append(logs, l)
	}
	return c.JSON(logs)
}
