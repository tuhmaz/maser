package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/middleware"
	"github.com/alemedu/api/internal/utils"
)

// ParentHandler يربط حساب ولي أمر بحساب طالب بموافقة الطالب الصريحة (لا يستطيع
// أي مستخدم ربط نفسه بطالب دون علمه) — docs/user-journeys.md: ولي الأمر يتابع
// تقدم الأبناء دون الاطلاع على معلومات تعليمية غير ضرورية.
type ParentHandler struct {
	db *pgxpool.Pool
}

func NewParentHandler(db *pgxpool.Pool) *ParentHandler {
	return &ParentHandler{db: db}
}

type linkRequestBody struct {
	StudentEmail string `json:"studentEmail"`
}

// RequestLink يبدأ طلب ربط بولي الأمر الحالي مع طالب عبر بريده. يبقى الطلب
// pending حتى يوافق الطالب صراحةً.
func (h *ParentHandler) RequestLink(c *fiber.Ctx) error {
	parentID, _ := middleware.UserIDFromContext(c)

	var req linkRequestBody
	if err := c.BodyParser(&req); err != nil || req.StudentEmail == "" {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "validation_error", "studentEmail مطلوب")
	}

	var studentID string
	err := h.db.QueryRow(c.Context(), `
		SELECT u.id FROM users u
		JOIN user_roles ur ON ur.user_id = u.id
		JOIN roles r ON r.id = ur.role_id
		WHERE u.email = $1 AND r.name = 'student' AND u.deleted_at IS NULL
	`, req.StudentEmail).Scan(&studentID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "لا يوجد حساب طالب بهذا البريد")
	}
	if studentID == parentID {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "invalid_target", "لا يمكن ربط الحساب بنفسه")
	}

	if _, err := h.db.Exec(c.Context(), `
		INSERT INTO parent_student_links (parent_user_id, student_user_id, status)
		VALUES ($1, $2, 'pending')
		ON CONFLICT (parent_user_id, student_user_id) DO UPDATE SET status = 'pending'
	`, parentID, studentID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر إرسال طلب الربط")
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"requested": true})
}

type linkRequestDTO struct {
	ParentUserID string `json:"parentUserId"`
	ParentName   string `json:"parentName"`
	ParentEmail  string `json:"parentEmail"`
}

// IncomingRequests طلبات الربط المعلَّقة الموجَّهة للطالب الحالي.
func (h *ParentHandler) IncomingRequests(c *fiber.Ctx) error {
	studentID, _ := middleware.UserIDFromContext(c)
	rows, err := h.db.Query(c.Context(), `
		SELECT u.id, u.display_name, u.email
		FROM parent_student_links l
		JOIN users u ON u.id = l.parent_user_id
		WHERE l.student_user_id = $1 AND l.status = 'pending'
	`, studentID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب الطلبات")
	}
	defer rows.Close()
	items := []linkRequestDTO{}
	for rows.Next() {
		var r linkRequestDTO
		if err := rows.Scan(&r.ParentUserID, &r.ParentName, &r.ParentEmail); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة الطلبات")
		}
		items = append(items, r)
	}
	return c.JSON(items)
}

// RespondToRequest يوافق الطالب أو يرفض طلب ربط موجَّه إليه.
func (h *ParentHandler) RespondToRequest(c *fiber.Ctx) error {
	studentID, _ := middleware.UserIDFromContext(c)
	parentID := c.Params("parentId")

	var body struct {
		Approve bool `json:"approve"`
	}
	_ = c.BodyParser(&body)

	newStatus := "revoked"
	if body.Approve {
		newStatus = "active"
	}
	tag, err := h.db.Exec(c.Context(), `
		UPDATE parent_student_links SET status = $3
		WHERE parent_user_id = $1 AND student_user_id = $2 AND status = 'pending'
	`, parentID, studentID, newStatus)
	if err != nil || tag.RowsAffected() == 0 {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "لا يوجد طلب معلَّق بهذا الشكل")
	}
	return c.JSON(fiber.Map{"status": newStatus})
}

type childProgressDTO struct {
	StudentUserID  string   `json:"studentUserId"`
	DisplayName    string   `json:"displayName"`
	GradeName      string   `json:"gradeName,omitempty"`
	CurrentStreak  int      `json:"currentStreak"`
	LastQuizScore  *float64 `json:"lastQuizScore,omitempty"`
	MasteredSkills int      `json:"masteredSkills"`
}

// Children يعيد تقدّمًا مبسطًا لكل طالب مرتبط فعليًا (status='active') —
// لا تفاصيل تعليمية غير ضرورية (docs/user-journeys.md مبدأ ولي الأمر).
func (h *ParentHandler) Children(c *fiber.Ctx) error {
	parentID, _ := middleware.UserIDFromContext(c)
	rows, err := h.db.Query(c.Context(), `
		SELECT u.id, u.display_name, COALESCE(g.name, ''), COALESCE(ss.current_streak, 0),
		       (SELECT ar.score FROM attempt_results ar JOIN attempts a ON a.id = ar.attempt_id
		        WHERE a.user_id = u.id ORDER BY ar.computed_at DESC LIMIT 1),
		       (SELECT COUNT(*) FROM student_skill_mastery m WHERE m.user_id = u.id AND m.state = 'mastered')
		FROM parent_student_links l
		JOIN users u ON u.id = l.student_user_id
		LEFT JOIN student_profiles sp ON sp.user_id = u.id
		LEFT JOIN grades g ON g.id = sp.grade_id
		LEFT JOIN student_streaks ss ON ss.user_id = u.id
		WHERE l.parent_user_id = $1 AND l.status = 'active'
	`, parentID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب بيانات الأبناء")
	}
	defer rows.Close()
	items := []childProgressDTO{}
	for rows.Next() {
		var d childProgressDTO
		if err := rows.Scan(&d.StudentUserID, &d.DisplayName, &d.GradeName, &d.CurrentStreak, &d.LastQuizScore, &d.MasteredSkills); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة البيانات")
		}
		items = append(items, d)
	}
	return c.JSON(items)
}
