package repository

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SessionRepository struct {
	db *pgxpool.Pool
}

func NewSessionRepository(db *pgxpool.Pool) *SessionRepository {
	return &SessionRepository{db: db}
}

// HashToken لا نُخزّن رمز التحديث كنص مباشر أبدًا في قاعدة البيانات.
func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func (r *SessionRepository) Create(ctx context.Context, userID, refreshToken, userAgent, ip string, ttl time.Duration) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO user_sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
		VALUES ($1, $2, $3, NULLIF($4, '')::inet, now() + $5::interval)
	`, userID, HashToken(refreshToken), userAgent, ip, ttl.String())
	return err
}

// FindActiveByToken يبحث عن جلسة صالحة (غير منتهية وغير ملغاة) عبر رمز التحديث.
func (r *SessionRepository) FindActiveByToken(ctx context.Context, refreshToken string) (userID string, err error) {
	err = r.db.QueryRow(ctx, `
		SELECT user_id FROM user_sessions
		WHERE refresh_token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
	`, HashToken(refreshToken)).Scan(&userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrNotFound
		}
		return "", err
	}
	return userID, nil
}

func (r *SessionRepository) RevokeAllForUser(ctx context.Context, userID string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE user_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL
	`, userID)
	return err
}

func (r *SessionRepository) RevokeByToken(ctx context.Context, refreshToken string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE user_sessions SET revoked_at = now() WHERE refresh_token_hash = $1
	`, HashToken(refreshToken))
	return err
}
