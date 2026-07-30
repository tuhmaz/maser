package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/audit"
	"github.com/alemedu/api/internal/middleware"
	"github.com/alemedu/api/internal/utils"
)

// AdminQuestionsHandler ينفّذ دورة حياة السؤال كاملة (docs/question-model.md):
// Draft → In Review → Changes Requested → Approved → Published → Archived.
// قاعدة صارمة: لا يُعدَّل إصدار سؤال ظهر لطالب من قبل — أي تعديل بعد النشر
// ينشئ إصدارًا جديدًا (question_versions) فتبقى النتائج القديمة قابلة للمراجعة بدقة.
type AdminQuestionsHandler struct {
	db *pgxpool.Pool
}

func NewAdminQuestionsHandler(db *pgxpool.Pool) *AdminQuestionsHandler {
	return &AdminQuestionsHandler{db: db}
}

var validQuestionTypes = map[string]bool{
	"single_choice": true, "true_false": true, "numeric_input": true,
	"multi_select": true, "ordering": true, "matching": true,
}
var validDifficulties = map[string]bool{"easy": true, "medium": true, "hard": true}

type questionSummaryDTO struct {
	ID          string   `json:"id"`
	LessonID    string   `json:"lessonId"`
	LessonName  string   `json:"lessonName"`
	Type        string   `json:"type"`
	Difficulty  string   `json:"difficulty"`
	Status      string   `json:"status"`
	Body        string   `json:"body"`
	UsageCount  int      `json:"usageCount"`
	ErrorRate   *float64 `json:"errorRate"`
	OpenReports int      `json:"openReports"`
}

// List يدعم التصفية بالحالة والدرس والبحث النصي، مع أداء الاستخدام ونسبة الخطأ
// (docs/user-journeys.md: لوحة الإدارة → عرض أداء السؤال).
func (h *AdminQuestionsHandler) List(c *fiber.Ctx) error {
	status := c.Query("status")
	lessonID := c.Query("lessonId")
	search := c.Query("q")

	query := `
		SELECT q.id, q.lesson_id, l.name, q.question_type, q.difficulty, q.status,
		       qv.body,
		       COUNT(aa.id) AS usage_count,
		       CASE WHEN COUNT(aa.id) = 0 THEN NULL
		            ELSE COUNT(aa.id) FILTER (WHERE aa.is_correct = false)::float / COUNT(aa.id) END,
		       COUNT(qr.id) FILTER (WHERE qr.status = 'open')
		FROM questions q
		JOIN lessons l ON l.id = q.lesson_id
		JOIN question_versions qv ON qv.question_id = q.id
		  AND qv.version_number = (SELECT MAX(version_number) FROM question_versions WHERE question_id = q.id)
		LEFT JOIN attempt_answers aa ON aa.question_id = q.id
		LEFT JOIN question_reports qr ON qr.question_id = q.id
		WHERE ($1 = '' OR q.status = $1)
		  AND ($2 = '' OR q.lesson_id::text = $2)
		  AND ($3 = '' OR qv.body ILIKE '%' || $3 || '%')
		GROUP BY q.id, q.lesson_id, l.name, q.question_type, q.difficulty, q.status, qv.body
		ORDER BY q.created_at DESC
		LIMIT 200
	`
	rows, err := h.db.Query(c.Context(), query, status, lessonID, search)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب الأسئلة")
	}
	defer rows.Close()

	items := []questionSummaryDTO{}
	for rows.Next() {
		var q questionSummaryDTO
		if err := rows.Scan(&q.ID, &q.LessonID, &q.LessonName, &q.Type, &q.Difficulty, &q.Status,
			&q.Body, &q.UsageCount, &q.ErrorRate, &q.OpenReports); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة الأسئلة")
		}
		items = append(items, q)
	}
	return c.JSON(items)
}

type questionOptionDTO struct {
	ID          string `json:"id,omitempty"`
	Text        string `json:"text"`
	Order       int    `json:"order"`
	IsCorrect   bool   `json:"isCorrect"`
	WrongReason string `json:"wrongReason,omitempty"`
}

type questionDetailDTO struct {
	ID              string              `json:"id"`
	GradeID         string              `json:"gradeId"`
	SubjectID       string              `json:"subjectId"`
	UnitID          string              `json:"unitId"`
	LessonID        string              `json:"lessonId"`
	Type            string              `json:"type"`
	Difficulty      string              `json:"difficulty"`
	ExpectedTimeSec int                 `json:"expectedTimeSec"`
	Status          string              `json:"status"`
	VersionNumber   int                 `json:"versionNumber"`
	Body            string              `json:"body"`
	Explanation     string              `json:"explanation,omitempty"`
	Options         []questionOptionDTO `json:"options,omitempty"`
	NumericAnswer   *string             `json:"numericAnswer,omitempty"`
	Tolerance       *float64            `json:"tolerance,omitempty"`
	SkillIDs        []string            `json:"skillIds"`
}

// Get يعيد أحدث إصدار (المسودة قيد التحرير إن وُجدت، وإلا آخر إصدار منشور)
// للتحرير في لوحة الإدارة.
func (h *AdminQuestionsHandler) Get(c *fiber.Ctx) error {
	id := c.Params("id")

	var q questionDetailDTO
	var versionID string
	err := h.db.QueryRow(c.Context(), `
		SELECT q.id, q.grade_id, q.subject_id, q.unit_id, q.lesson_id, q.question_type,
		       q.difficulty, q.expected_time_sec, q.status,
		       qv.id, qv.version_number, qv.body, COALESCE(qv.explanation, '')
		FROM questions q
		JOIN question_versions qv ON qv.question_id = q.id
		  AND qv.version_number = (SELECT MAX(version_number) FROM question_versions WHERE question_id = q.id)
		WHERE q.id = $1
	`, id).Scan(&q.ID, &q.GradeID, &q.SubjectID, &q.UnitID, &q.LessonID, &q.Type,
		&q.Difficulty, &q.ExpectedTimeSec, &q.Status, &versionID, &q.VersionNumber, &q.Body, &q.Explanation)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "السؤال غير موجود")
	}

	optRows, err := h.db.Query(c.Context(), `
		SELECT id, text, "order", is_correct, COALESCE(wrong_reason, '')
		FROM question_options WHERE question_version_id = $1 ORDER BY "order"
	`, versionID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب خيارات السؤال")
	}
	defer optRows.Close()
	for optRows.Next() {
		var o questionOptionDTO
		if err := optRows.Scan(&o.ID, &o.Text, &o.Order, &o.IsCorrect, &o.WrongReason); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة الخيارات")
		}
		q.Options = append(q.Options, o)
	}

	_ = h.db.QueryRow(c.Context(), `
		SELECT answer_value, tolerance FROM question_answers WHERE question_version_id = $1 LIMIT 1
	`, versionID).Scan(&q.NumericAnswer, &q.Tolerance)

	skillRows, err := h.db.Query(c.Context(), `SELECT skill_id FROM question_skills WHERE question_id = $1`, id)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب المهارات المرتبطة")
	}
	defer skillRows.Close()
	q.SkillIDs = []string{}
	for skillRows.Next() {
		var sid string
		if err := skillRows.Scan(&sid); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة المهارات")
		}
		q.SkillIDs = append(q.SkillIDs, sid)
	}

	return c.JSON(q)
}

type saveQuestionRequest struct {
	GradeID         string              `json:"gradeId"`
	SubjectID       string              `json:"subjectId"`
	UnitID          string              `json:"unitId"`
	LessonID        string              `json:"lessonId"`
	Type            string              `json:"type"`
	Difficulty      string              `json:"difficulty"`
	ExpectedTimeSec int                 `json:"expectedTimeSec"`
	Body            string              `json:"body"`
	Explanation     string              `json:"explanation"`
	Options         []questionOptionDTO `json:"options"`
	NumericAnswer   *string             `json:"numericAnswer"`
	Tolerance       *float64            `json:"tolerance"`
	SkillIDs        []string            `json:"skillIds"`
}

func (r *saveQuestionRequest) validate() string {
	if r.Body == "" {
		return "نص السؤال مطلوب"
	}
	if !validQuestionTypes[r.Type] {
		return "نوع السؤال غير صالح"
	}
	if r.Difficulty != "" && !validDifficulties[r.Difficulty] {
		return "الصعوبة يجب أن تكون easy/medium/hard"
	}
	switch r.Type {
	case "single_choice", "true_false", "multi_select", "ordering":
		if len(r.Options) < 2 {
			return "يلزم خياران على الأقل"
		}
		if r.Type != "ordering" {
			hasCorrect := false
			for _, o := range r.Options {
				if o.IsCorrect {
					hasCorrect = true
				}
			}
			if !hasCorrect {
				return "يجب تحديد إجابة صحيحة واحدة على الأقل"
			}
		}
	case "numeric_input":
		if r.NumericAnswer == nil || *r.NumericAnswer == "" {
			return "الإجابة العددية مطلوبة"
		}
	}
	if len(r.SkillIDs) == 0 {
		return "يجب ربط السؤال بمهارة واحدة على الأقل (docs/question-model.md)"
	}
	return ""
}

// Create ينشئ سؤالًا جديدًا كمسودة (draft) بإصدار أول غير منشور.
func (h *AdminQuestionsHandler) Create(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	var req saveQuestionRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "invalid_body", "تعذّرت قراءة الطلب")
	}
	if req.GradeID == "" || req.SubjectID == "" || req.UnitID == "" || req.LessonID == "" {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "validation_error", "gradeId/subjectId/unitId/lessonId مطلوبة")
	}
	if msg := req.validate(); msg != "" {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "validation_error", msg)
	}
	if req.Difficulty == "" {
		req.Difficulty = "medium"
	}
	if req.ExpectedTimeSec == 0 {
		req.ExpectedTimeSec = 60
	}

	tx, err := h.db.Begin(c.Context())
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر بدء العملية")
	}
	defer tx.Rollback(c.Context())

	var questionID string
	err = tx.QueryRow(c.Context(), `
		INSERT INTO questions (grade_id, subject_id, unit_id, lesson_id, question_type, difficulty, expected_time_sec, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`, req.GradeID, req.SubjectID, req.UnitID, req.LessonID, req.Type, req.Difficulty, req.ExpectedTimeSec, userID).Scan(&questionID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "invalid_reference", "تأكد من صحة الصف/المادة/الوحدة/الدرس")
	}

	if err := h.writeVersion(c, tx, questionID, 1, req, userID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر حفظ محتوى السؤال")
	}
	if err := h.linkSkills(c, tx, questionID, req.SkillIDs); err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "invalid_skill", "تعذّر ربط المهارات")
	}

	if err := tx.Commit(c.Context()); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر حفظ السؤال")
	}
	audit.Log(c.Context(), h.db, userID, "question.create", "question", questionID, map[string]any{"type": req.Type})
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"id": questionID})
}

// Update يحرر أحدث إصدار في مكانه إن لم يُنشر بعد، أو ينشئ إصدارًا جديدًا
// إن كان الإصدار الحالي منشورًا فعليًا — لضمان عدم تغيير نتائج قديمة.
func (h *AdminQuestionsHandler) Update(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	questionID := c.Params("id")

	var req saveQuestionRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "invalid_body", "تعذّرت قراءة الطلب")
	}
	if msg := req.validate(); msg != "" {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "validation_error", msg)
	}

	var latestVersion int
	var publishedAt *string
	var status string
	err := h.db.QueryRow(c.Context(), `
		SELECT qv.version_number, qv.published_at::text, q.status
		FROM questions q
		JOIN question_versions qv ON qv.question_id = q.id
		  AND qv.version_number = (SELECT MAX(version_number) FROM question_versions WHERE question_id = q.id)
		WHERE q.id = $1
	`, questionID).Scan(&latestVersion, &publishedAt, &status)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "السؤال غير موجود")
	}
	if status == "archived" {
		return utils.ErrorResponse(c, fiber.StatusConflict, "archived", "لا يمكن تعديل سؤال مؤرشف")
	}

	tx, err := h.db.Begin(c.Context())
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر بدء العملية")
	}
	defer tx.Rollback(c.Context())

	targetVersion := latestVersion
	newVersionCreated := false
	if publishedAt != nil {
		// الإصدار الحالي ظهر لطالب من قبل — لا يُعدَّل، يُنشأ إصدار جديد
		targetVersion = latestVersion + 1
		newVersionCreated = true
	} else {
		// إصدار لم يُنشر بعد: نعدّله في مكانه (احذف المحتوى القديم لإعادة كتابته)
		if _, err := tx.Exec(c.Context(), `DELETE FROM question_versions WHERE question_id = $1 AND version_number = $2`, questionID, latestVersion); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر تحديث السؤال")
		}
	}

	if err := h.writeVersion(c, tx, questionID, targetVersion, req, userID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر حفظ محتوى السؤال")
	}
	if err := h.linkSkills(c, tx, questionID, req.SkillIDs); err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "invalid_skill", "تعذّر ربط المهارات")
	}

	newStatus := status
	if newVersionCreated {
		newStatus = "draft" // تعديل بعد النشر يعيد السؤال لدورة المراجعة قبل ظهوره من جديد
	}
	if _, err := tx.Exec(c.Context(), `
		UPDATE questions SET question_type = $2, difficulty = COALESCE(NULLIF($3, ''), difficulty),
		       expected_time_sec = COALESCE(NULLIF($4, 0), expected_time_sec), status = $5, updated_at = now()
		WHERE id = $1
	`, questionID, req.Type, req.Difficulty, req.ExpectedTimeSec, newStatus); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر تحديث السؤال")
	}

	if err := tx.Commit(c.Context()); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر حفظ التعديلات")
	}
	audit.Log(c.Context(), h.db, userID, "question.update", "question", questionID, map[string]any{"newVersion": newVersionCreated})
	return c.JSON(fiber.Map{"updated": true, "newVersionCreated": newVersionCreated})
}

func (h *AdminQuestionsHandler) writeVersion(c *fiber.Ctx, tx pgx.Tx, questionID string, versionNumber int, req saveQuestionRequest, userID string) error {
	var versionID string
	if err := tx.QueryRow(c.Context(), `
		INSERT INTO question_versions (question_id, version_number, body, explanation, created_by)
		VALUES ($1, $2, $3, NULLIF($4, ''), $5)
		RETURNING id
	`, questionID, versionNumber, req.Body, req.Explanation, userID).Scan(&versionID); err != nil {
		return err
	}

	for _, o := range req.Options {
		if _, err := tx.Exec(c.Context(), `
			INSERT INTO question_options (question_version_id, text, is_correct, wrong_reason, "order")
			VALUES ($1, $2, $3, NULLIF($4, ''), $5)
		`, versionID, o.Text, o.IsCorrect, o.WrongReason, o.Order); err != nil {
			return err
		}
	}
	if req.Type == "numeric_input" && req.NumericAnswer != nil {
		if _, err := tx.Exec(c.Context(), `
			INSERT INTO question_answers (question_version_id, answer_value, tolerance) VALUES ($1, $2, $3)
		`, versionID, *req.NumericAnswer, req.Tolerance); err != nil {
			return err
		}
	}
	if req.Explanation != "" {
		if _, err := tx.Exec(c.Context(), `
			INSERT INTO question_explanations (question_version_id, body) VALUES ($1, $2)
		`, versionID, req.Explanation); err != nil {
			return err
		}
	}
	return nil
}

func (h *AdminQuestionsHandler) linkSkills(c *fiber.Ctx, tx pgx.Tx, questionID string, skillIDs []string) error {
	if _, err := tx.Exec(c.Context(), `DELETE FROM question_skills WHERE question_id = $1`, questionID); err != nil {
		return err
	}
	for _, skillID := range skillIDs {
		if _, err := tx.Exec(c.Context(), `
			INSERT INTO question_skills (question_id, skill_id) VALUES ($1, $2)
		`, questionID, skillID); err != nil {
			return err
		}
	}
	return nil
}

// SubmitForReview ينقل السؤال من draft/changes_requested إلى in_review.
func (h *AdminQuestionsHandler) SubmitForReview(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	id := c.Params("id")
	tag, err := h.db.Exec(c.Context(), `
		UPDATE questions SET status = 'in_review', updated_at = now()
		WHERE id = $1 AND status IN ('draft', 'changes_requested')
	`, id)
	if err != nil || tag.RowsAffected() == 0 {
		return utils.ErrorResponse(c, fiber.StatusConflict, "invalid_transition", "لا يمكن إرسال هذا السؤال للمراجعة من حالته الحالية")
	}
	audit.Log(c.Context(), h.db, userID, "question.submit_review", "question", id, nil)
	return c.JSON(fiber.Map{"status": "in_review"})
}

type reviewQuestionRequest struct {
	Decision string `json:"decision"` // "approved" | "changes_requested"
	Comment  string `json:"comment"`
}

// Review يسجّل قرار المراجع التربوي (docs/user-journeys.md: المراجع التعليمي
// يراجع دقة السؤال والحل والتفسير قبل النشر).
func (h *AdminQuestionsHandler) Review(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	id := c.Params("id")

	var req reviewQuestionRequest
	if err := c.BodyParser(&req); err != nil || (req.Decision != "approved" && req.Decision != "changes_requested") {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "validation_error", `decision يجب أن تكون "approved" أو "changes_requested"`)
	}

	newStatus := "approved"
	if req.Decision == "changes_requested" {
		newStatus = "changes_requested"
	}
	tag, err := h.db.Exec(c.Context(), `
		UPDATE questions SET status = $2, updated_at = now() WHERE id = $1 AND status = 'in_review'
	`, id, newStatus)
	if err != nil || tag.RowsAffected() == 0 {
		return utils.ErrorResponse(c, fiber.StatusConflict, "invalid_transition", "السؤال ليس قيد المراجعة حاليًا")
	}
	if _, err := h.db.Exec(c.Context(), `
		INSERT INTO content_reviews (question_id, reviewer_id, decision, comment) VALUES ($1, $2, $3, NULLIF($4, ''))
	`, id, userID, req.Decision, req.Comment); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر حفظ قرار المراجعة")
	}
	audit.Log(c.Context(), h.db, userID, "question.review", "question", id, map[string]any{"decision": req.Decision})
	return c.JSON(fiber.Map{"status": newStatus})
}

// Publish ينشر أحدث إصدار معتمد ويربطه تلقائيًا باختبار درسه
// (يُنشئ اختبار الدرس عند أول نشر لسؤال فيه — لا حاجة لإدارة اختبارات يدويًا).
func (h *AdminQuestionsHandler) Publish(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	id := c.Params("id")

	tx, err := h.db.Begin(c.Context())
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر بدء العملية")
	}
	defer tx.Rollback(c.Context())

	var lessonID string
	var maxVersion int
	err = tx.QueryRow(c.Context(), `
		SELECT lesson_id, current_version FROM questions WHERE id = $1 AND status = 'approved'
	`, id).Scan(&lessonID, &maxVersion)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusConflict, "invalid_transition", "لا يمكن نشر سؤال لم يُعتمَد بعد")
	}
	if err := tx.QueryRow(c.Context(), `
		SELECT MAX(version_number) FROM question_versions WHERE question_id = $1
	`, id).Scan(&maxVersion); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة إصدار السؤال")
	}

	var versionID string
	if err := tx.QueryRow(c.Context(), `
		UPDATE question_versions SET published_at = now()
		WHERE question_id = $1 AND version_number = $2
		RETURNING id
	`, id, maxVersion).Scan(&versionID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر نشر الإصدار")
	}
	if _, err := tx.Exec(c.Context(), `
		UPDATE questions SET status = 'published', current_version = $2 WHERE id = $1
	`, id, maxVersion); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر تحديث حالة السؤال")
	}

	// ابحث عن اختبار الدرس أو أنشئه، ثم أضف السؤال إليه إن لم يكن موجودًا
	var quizID string
	err = tx.QueryRow(c.Context(), `SELECT id FROM quizzes WHERE lesson_id = $1 AND quiz_type = 'lesson'`, lessonID).Scan(&quizID)
	if errors.Is(err, pgx.ErrNoRows) {
		var lessonName string
		if err := tx.QueryRow(c.Context(), `SELECT name FROM lessons WHERE id = $1`, lessonID).Scan(&lessonName); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة اسم الدرس")
		}
		if err := tx.QueryRow(c.Context(), `
			INSERT INTO quizzes (quiz_type, lesson_id, title) VALUES ('lesson', $1, $2) RETURNING id
		`, lessonID, "اختبار "+lessonName).Scan(&quizID); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر إنشاء اختبار الدرس")
		}
	} else if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب اختبار الدرس")
	}
	var nextOrder int
	if err := tx.QueryRow(c.Context(), `SELECT COALESCE(MAX("order"), 0) + 1 FROM quiz_questions WHERE quiz_id = $1`, quizID).Scan(&nextOrder); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر ترتيب السؤال في الاختبار")
	}
	if _, err := tx.Exec(c.Context(), `
		INSERT INTO quiz_questions (quiz_id, question_id, "order") VALUES ($1, $2, $3)
		ON CONFLICT (quiz_id, question_id) DO NOTHING
	`, quizID, id, nextOrder); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر إضافة السؤال للاختبار")
	}
	if _, err := tx.Exec(c.Context(), `
		INSERT INTO content_publications (question_id, question_version_id, published_by) VALUES ($1, $2, $3)
	`, id, versionID, userID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر تسجيل النشر")
	}

	if err := tx.Commit(c.Context()); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر إتمام النشر")
	}
	audit.Log(c.Context(), h.db, userID, "question.publish", "question", id, map[string]any{"quizId": quizID})
	return c.JSON(fiber.Map{"status": "published", "quizId": quizID})
}

// Archive يعطّل سؤالًا دون حذف نتائجه السابقة — يختفي من الاختبارات الجديدة
// فورًا (loadQuestions يشترط status='published') بينما تبقى محاولات الطلاب القديمة سليمة.
func (h *AdminQuestionsHandler) Archive(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	id := c.Params("id")
	tag, err := h.db.Exec(c.Context(), `
		UPDATE questions SET status = 'archived', archived_at = now() WHERE id = $1 AND status <> 'archived'
	`, id)
	if err != nil || tag.RowsAffected() == 0 {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "السؤال غير موجود أو مؤرشف بالفعل")
	}
	audit.Log(c.Context(), h.db, userID, "question.archive", "question", id, nil)
	return c.JSON(fiber.Map{"status": "archived"})
}

// Delete يُسمح به فقط للمسودات التي لم تُنشر أبدًا (لا نتائج طلاب لحمايتها).
func (h *AdminQuestionsHandler) Delete(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	id := c.Params("id")
	tag, err := h.db.Exec(c.Context(), `DELETE FROM questions WHERE id = $1 AND status = 'draft'`, id)
	if err != nil || tag.RowsAffected() == 0 {
		return utils.ErrorResponse(c, fiber.StatusConflict, "not_deletable", "لا يمكن حذف سؤال إلا وهو مسودة — استخدم الأرشفة بدلًا من ذلك")
	}
	audit.Log(c.Context(), h.db, userID, "question.delete", "question", id, nil)
	return c.SendStatus(fiber.StatusNoContent)
}
