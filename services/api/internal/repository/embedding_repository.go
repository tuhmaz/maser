package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/pgvector/pgvector-go"
)

// EmbeddingRepository يدير تضمينات محتوى المنهاج (content_embeddings) — بنية
// تحتية فقط لدعم البحث الدلالي لاحقًا (docs/ai-curriculum-roadmap.md، E01).
// لا توليد فعلي للتضمينات هنا؛ ذلك يحتاج مزوّد AI يُختار في E04.
type EmbeddingRepository struct {
	db Querier
}

func NewEmbeddingRepository(db *pgxpool.Pool) *EmbeddingRepository {
	return &EmbeddingRepository{db: db}
}

// WithTx يعيد نسخة من المستودع تعمل داخل معاملة قائمة بدل المجمّع مباشرة.
func (r *EmbeddingRepository) WithTx(tx pgx.Tx) *EmbeddingRepository {
	return &EmbeddingRepository{db: tx}
}

type ContentEmbedding struct {
	ID          string          `json:"id"`
	ContentType string          `json:"contentType"`
	ContentID   string          `json:"contentId"`
	Model       string          `json:"model"`
	Embedding   pgvector.Vector `json:"-"`
}

// Upsert يخزّن تضمين محتوى، ويستبدل القيمة إن وُجد تضمين سابق بنفس
// content_type/content_id/model (مثلًا بعد تعديل نص المحتوى المصدر).
func (r *EmbeddingRepository) Upsert(ctx context.Context, contentType, contentID, model string, embedding pgvector.Vector) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO content_embeddings (content_type, content_id, model, embedding)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (content_type, content_id, model)
		DO UPDATE SET embedding = EXCLUDED.embedding
	`, contentType, contentID, model, embedding)
	return err
}

// ForContent يعيد كل التضمينات المخزَّنة لمحتوى معيّن (قد تتعدد بتعدد النماذج).
func (r *EmbeddingRepository) ForContent(ctx context.Context, contentType, contentID string) ([]ContentEmbedding, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, content_type, content_id, model, embedding
		FROM content_embeddings
		WHERE content_type = $1 AND content_id = $2
	`, contentType, contentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var embeddings []ContentEmbedding
	for rows.Next() {
		var e ContentEmbedding
		if err := rows.Scan(&e.ID, &e.ContentType, &e.ContentID, &e.Model, &e.Embedding); err != nil {
			return nil, err
		}
		embeddings = append(embeddings, e)
	}
	return embeddings, rows.Err()
}

// DeleteForContent يحذف كل تضمينات محتوى معيّن — يُستخدم عند حذف/تعديل جوهري
// للمحتوى المصدر (مثلًا نسخة سؤال جديدة تُبطل تضمين النسخة القديمة).
func (r *EmbeddingRepository) DeleteForContent(ctx context.Context, contentType, contentID string) error {
	_, err := r.db.Exec(ctx, `
		DELETE FROM content_embeddings WHERE content_type = $1 AND content_id = $2
	`, contentType, contentID)
	return err
}
