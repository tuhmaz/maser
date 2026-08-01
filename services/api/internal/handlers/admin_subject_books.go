package handlers

import (
	"context"
	"errors"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/audit"
	"github.com/alemedu/api/internal/middleware"
	"github.com/alemedu/api/internal/repository"
	"github.com/alemedu/api/internal/storage"
	"github.com/alemedu/api/internal/utils"
)

// AdminSubjectBooksHandler يدير رفع كتب المادة (طالب/تمارين/معلم) وتشغيل
// تحليل AI غير متزامن لهيكل المنهاج كمسودة (docs/ai-curriculum-roadmap.md — E10
// مرحلة 1). لا يكتب أي شيء في units/lessons/skills مباشرة — فقط يخزّن الكتاب
// ويُشغّل التحليل عبر ai_jobs، والنتيجة تُقرَأ عبر ListSubjectBooks للمراجعة
// البشرية اللاحقة (الاستيراد الفعلي للمنهاج حزمة تالية منفصلة).
type AdminSubjectBooksHandler struct {
	db     *pgxpool.Pool
	store  storage.Storage
	aiJobs *repository.AIJobRepository
}

func NewAdminSubjectBooksHandler(db *pgxpool.Pool, store storage.Storage, aiJobs *repository.AIJobRepository) *AdminSubjectBooksHandler {
	return &AdminSubjectBooksHandler{db: db, store: store, aiJobs: aiJobs}
}

var validBookTypes = map[string]bool{"student": true, "exercises": true, "teacher": true}

const maxBookUploadBytes = 50 * 1024 * 1024 // 50MB — كتب PDF أكبر بكثير من صور الأسئلة (5MB)

// UploadBook يرفع كتابًا (PDF فقط) لمادة، يستبدل أي كتاب سابق من نفس النوع
// لنفس المادة، ثم يُشغّل مهمة تحليل AI غير متزامنة عبر ai_jobs (E02).
func (h *AdminSubjectBooksHandler) UploadBook(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	subjectID := c.Params("id")

	bookType := c.FormValue("bookType")
	if !validBookTypes[bookType] {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "validation_error", "bookType يجب أن يكون student أو exercises أو teacher")
	}

	var subjectExists bool
	if err := h.db.QueryRow(c.Context(), `SELECT EXISTS(SELECT 1 FROM subjects WHERE id = $1)`, subjectID).Scan(&subjectExists); err != nil || !subjectExists {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "المادة غير موجودة")
	}

	file, err := c.FormFile("file")
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "invalid_body", "يجب إرفاق ملف باسم الحقل file")
	}
	if file.Size > maxBookUploadBytes {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "file_too_large", "الحد الأقصى لحجم الكتاب 50 ميغابايت")
	}
	if ext := strings.ToLower(filepath.Ext(file.Filename)); ext != ".pdf" {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "unsupported_type", "يُسمح فقط بملفات PDF")
	}

	relPath := filepath.ToSlash(filepath.Join("books", subjectID, bookType, uuid.NewString()+".pdf"))
	url, err := h.store.Save(file, relPath)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر حفظ الملف")
	}

	var subjectBookID string
	err = h.db.QueryRow(c.Context(), `
		INSERT INTO subject_books (subject_id, book_type, storage_path, url, uploaded_by)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (subject_id, book_type)
		DO UPDATE SET storage_path = EXCLUDED.storage_path, url = EXCLUDED.url,
		              uploaded_by = EXCLUDED.uploaded_by, created_at = now()
		RETURNING id
	`, subjectID, bookType, relPath, url, userID).Scan(&subjectBookID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر تسجيل الكتاب")
	}

	if _, err := h.aiJobs.Enqueue(c.Context(), "analyze_book", map[string]string{"subjectBookId": subjectBookID}); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جدولة مهمة التحليل")
	}

	audit.Log(c.Context(), h.db, userID, "subject.upload_book", "subject", subjectID, map[string]any{"bookType": bookType})
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"id": subjectBookID, "url": url})
}

type bookAnalysisDTO struct {
	Status            string  `json:"status"`
	ProposedStructure *string `json:"proposedStructure,omitempty"` // JSON خام يُعرض كما هو للمراجعة (لا فك تسلسل هنا)
	ErrorMessage      *string `json:"errorMessage,omitempty"`
	CompletedAt       *string `json:"completedAt,omitempty"`
	ImportedAt        *string `json:"importedAt,omitempty"`
}

type subjectBookDTO struct {
	ID        string           `json:"id"`
	BookType  string           `json:"bookType"`
	URL       string           `json:"url"`
	CreatedAt string           `json:"createdAt"`
	Analysis  *bookAnalysisDTO `json:"analysis,omitempty"`
}

// ListBooks يعيد كتب المادة الحالية (بحد أقصى واحد لكل نوع بفضل UNIQUE) مع
// آخر نتيجة تحليل لكل كتاب.
func (h *AdminSubjectBooksHandler) ListBooks(c *fiber.Ctx) error {
	subjectID := c.Params("id")

	rows, err := h.db.Query(c.Context(), `
		SELECT sb.id, sb.book_type, sb.url, sb.created_at::text,
		       ba.status, ba.proposed_structure::text, ba.error_message, ba.completed_at::text, ba.imported_at::text
		FROM subject_books sb
		LEFT JOIN LATERAL (
			SELECT status, proposed_structure, error_message, completed_at, imported_at
			FROM book_analyses WHERE subject_book_id = sb.id
			ORDER BY created_at DESC LIMIT 1
		) ba ON true
		WHERE sb.subject_id = $1
		ORDER BY sb.book_type
	`, subjectID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب كتب المادة")
	}
	defer rows.Close()

	items := []subjectBookDTO{}
	for rows.Next() {
		var b subjectBookDTO
		var status, proposedStructure, errorMessage, completedAt, importedAt *string
		if err := rows.Scan(&b.ID, &b.BookType, &b.URL, &b.CreatedAt,
			&status, &proposedStructure, &errorMessage, &completedAt, &importedAt); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة كتب المادة")
		}
		if status != nil {
			b.Analysis = &bookAnalysisDTO{
				Status: *status, ProposedStructure: proposedStructure,
				ErrorMessage: errorMessage, CompletedAt: completedAt, ImportedAt: importedAt,
			}
		}
		items = append(items, b)
	}
	return c.JSON(items)
}

type importLessonInput struct {
	Name   string   `json:"name"`
	Skills []string `json:"skills"`
}

type importUnitInput struct {
	Name    string              `json:"name"`
	Lessons []importLessonInput `json:"lessons"`
}

type importStructureInput struct {
	Units []importUnitInput `json:"units"`
}

// ImportBookAnalysis يستورد هيكلًا حرّره الأدمن (بعد مراجعة proposed_structure)
// إلى units/lessons/skills الحقيقية — docs/ai-curriculum-roadmap.md، E10
// المرحلة 2. يعيد استخدام أي صف موجود بنفس الاسم بدل تكراره، فإعادة استيراد
// نفس الكتاب لا تُنتج نسخًا مكررة.
func (h *AdminSubjectBooksHandler) ImportBookAnalysis(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	subjectID := c.Params("id")
	bookID := c.Params("bookId")

	var req importStructureInput
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "invalid_body", "تعذّرت قراءة الطلب")
	}

	var analysisID, ownerSubjectID string
	err := h.db.QueryRow(c.Context(), `
		SELECT ba.id, sb.subject_id
		FROM book_analyses ba
		JOIN subject_books sb ON sb.id = ba.subject_book_id
		WHERE ba.subject_book_id = $1 AND ba.status = 'completed'
		ORDER BY ba.created_at DESC LIMIT 1
	`, bookID).Scan(&analysisID, &ownerSubjectID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "لا يوجد تحليل مكتمل لهذا الكتاب")
	}
	if ownerSubjectID != subjectID {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "الكتاب لا ينتمي لهذه المادة")
	}

	tx, err := h.db.Begin(c.Context())
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر بدء العملية")
	}
	defer tx.Rollback(c.Context())

	var importedUnits, importedLessons, importedSkills int
	for _, unit := range req.Units {
		unitName := strings.TrimSpace(unit.Name)
		if unitName == "" {
			continue
		}
		unitID, created, err := findOrCreateUnit(c.Context(), tx, subjectID, unitName)
		if err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر إنشاء الوحدة: "+unitName)
		}
		if created {
			importedUnits++
		}

		for _, lesson := range unit.Lessons {
			lessonName := strings.TrimSpace(lesson.Name)
			if lessonName == "" {
				continue
			}
			lessonID, created, err := findOrCreateLesson(c.Context(), tx, unitID, lessonName)
			if err != nil {
				return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر إنشاء الدرس: "+lessonName)
			}
			if created {
				importedLessons++
			}

			for _, skillName := range lesson.Skills {
				name := strings.TrimSpace(skillName)
				if name == "" {
					continue
				}
				skillID, created, err := findOrCreateSkill(c.Context(), tx, name)
				if err != nil {
					return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر إنشاء المهارة: "+name)
				}
				if created {
					importedSkills++
				}
				if _, err := tx.Exec(c.Context(), `
					INSERT INTO lesson_skills (lesson_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING
				`, lessonID, skillID); err != nil {
					return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر ربط المهارة بالدرس")
				}
			}
		}
	}

	if _, err := tx.Exec(c.Context(), `UPDATE book_analyses SET imported_at = now() WHERE id = $1`, analysisID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر تحديث حالة الاستيراد")
	}

	if err := tx.Commit(c.Context()); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر حفظ الاستيراد")
	}

	audit.Log(c.Context(), h.db, userID, "book_analysis.import", "subject_book", bookID, map[string]any{
		"importedUnits": importedUnits, "importedLessons": importedLessons, "importedSkills": importedSkills,
	})
	return c.JSON(fiber.Map{
		"importedUnits": importedUnits, "importedLessons": importedLessons, "importedSkills": importedSkills,
	})
}

func findOrCreateUnit(ctx context.Context, tx pgx.Tx, subjectID, name string) (id string, created bool, err error) {
	err = tx.QueryRow(ctx, `SELECT id FROM units WHERE subject_id = $1 AND name ILIKE $2 LIMIT 1`, subjectID, name).Scan(&id)
	if err == nil {
		return id, false, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", false, err
	}
	var nextOrder int
	if err := tx.QueryRow(ctx, `SELECT COALESCE(MAX("order"), 0) + 1 FROM units WHERE subject_id = $1`, subjectID).Scan(&nextOrder); err != nil {
		return "", false, err
	}
	if err := tx.QueryRow(ctx, `
		INSERT INTO units (subject_id, name, "order") VALUES ($1, $2, $3) RETURNING id
	`, subjectID, name, nextOrder).Scan(&id); err != nil {
		return "", false, err
	}
	return id, true, nil
}

func findOrCreateLesson(ctx context.Context, tx pgx.Tx, unitID, name string) (id string, created bool, err error) {
	err = tx.QueryRow(ctx, `SELECT id FROM lessons WHERE unit_id = $1 AND name ILIKE $2 LIMIT 1`, unitID, name).Scan(&id)
	if err == nil {
		return id, false, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", false, err
	}
	var nextOrder int
	if err := tx.QueryRow(ctx, `SELECT COALESCE(MAX("order"), 0) + 1 FROM lessons WHERE unit_id = $1`, unitID).Scan(&nextOrder); err != nil {
		return "", false, err
	}
	if err := tx.QueryRow(ctx, `
		INSERT INTO lessons (unit_id, name, "order") VALUES ($1, $2, $3) RETURNING id
	`, unitID, name, nextOrder).Scan(&id); err != nil {
		return "", false, err
	}
	return id, true, nil
}

func findOrCreateSkill(ctx context.Context, tx pgx.Tx, name string) (id string, created bool, err error) {
	err = tx.QueryRow(ctx, `SELECT id FROM skills WHERE name ILIKE $1 LIMIT 1`, name).Scan(&id)
	if err == nil {
		return id, false, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", false, err
	}
	if err := tx.QueryRow(ctx, `
		INSERT INTO skills (name, difficulty) VALUES ($1, 'medium') RETURNING id
	`, name).Scan(&id); err != nil {
		return "", false, err
	}
	return id, true, nil
}
