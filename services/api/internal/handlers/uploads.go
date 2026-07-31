package handlers

import (
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/audit"
	"github.com/alemedu/api/internal/middleware"
	"github.com/alemedu/api/internal/storage"
	"github.com/alemedu/api/internal/utils"
)

// UploadsHandler يخزّن صور الأسئلة عبر storage.Storage (محلي حاليًا، قابل
// لاستبداله لاحقًا بتنفيذ S3 دون تغيير هذا المعالج — docs/ai-curriculum-roadmap.md، E03).
// docs/database-design.md: Object Storage للصور، عدم تخزين الملفات داخل قاعدة البيانات.
type UploadsHandler struct {
	db    *pgxpool.Pool
	store storage.Storage
}

func NewUploadsHandler(db *pgxpool.Pool, store storage.Storage) *UploadsHandler {
	return &UploadsHandler{db: db, store: store}
}

var allowedImageExt = map[string]bool{".png": true, ".jpg": true, ".jpeg": true, ".webp": true, ".gif": true}

const maxUploadBytes = 5 * 1024 * 1024 // 5MB — سياسة رفع صارمة (docs/security-requirements.md)

// UploadQuestionMedia يرفع صورة لإصدار سؤال محدد. سياسة صارمة: نوع صورة فقط،
// حجم محدود، اسم ملف عشوائي (لا يُستخدم اسم الملف الأصلي كمسار أبدًا).
func (h *UploadsHandler) UploadQuestionMedia(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	questionID := c.Params("id")

	var versionID string
	if err := h.db.QueryRow(c.Context(), `
		SELECT id FROM question_versions WHERE question_id = $1
		ORDER BY version_number DESC LIMIT 1
	`, questionID).Scan(&versionID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "السؤال غير موجود")
	}

	file, err := c.FormFile("file")
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "invalid_body", "يجب إرفاق ملف باسم الحقل file")
	}
	if file.Size > maxUploadBytes {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "file_too_large", "الحد الأقصى لحجم الصورة 5 ميغابايت")
	}
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !allowedImageExt[ext] {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "unsupported_type", "يُسمح فقط بصور PNG/JPG/JPEG/WEBP/GIF")
	}

	datedDir := time.Now().Format("2006/01")
	filename := uuid.NewString() + ext
	relPath := filepath.ToSlash(filepath.Join("questions", datedDir, filename))

	url, err := h.store.Save(file, relPath)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر حفظ الملف")
	}
	mediaType := "image"

	var mediaID string
	if err := h.db.QueryRow(c.Context(), `
		INSERT INTO question_media (question_version_id, media_type, url) VALUES ($1, $2, $3) RETURNING id
	`, versionID, mediaType, url).Scan(&mediaID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر تسجيل الصورة")
	}

	audit.Log(c.Context(), h.db, userID, "question.upload_media", "question", questionID, fiber.Map{"mediaId": mediaID})
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"id": mediaID, "url": url})
}

// ListQuestionMedia يعيد كل صور آخر إصدار للسؤال — تُستخدم في نموذج التحرير.
func (h *UploadsHandler) ListQuestionMedia(c *fiber.Ctx) error {
	questionID := c.Params("id")
	rows, err := h.db.Query(c.Context(), `
		SELECT qm.id, qm.url FROM question_media qm
		JOIN question_versions qv ON qv.id = qm.question_version_id
		WHERE qv.question_id = $1 AND qv.version_number = (
			SELECT MAX(version_number) FROM question_versions WHERE question_id = $1
		)
	`, questionID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب الصور")
	}
	defer rows.Close()

	type mediaDTO struct {
		ID  string `json:"id"`
		URL string `json:"url"`
	}
	items := []mediaDTO{}
	for rows.Next() {
		var m mediaDTO
		if err := rows.Scan(&m.ID, &m.URL); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة الصور")
		}
		items = append(items, m)
	}
	return c.JSON(items)
}
