package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/models"
)

var ErrNotFound = errors.New("not found")
var ErrDuplicateEmail = errors.New("email already registered")

type UserRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{db: db}
}

// CreateStudent ينشئ مستخدمًا جديدًا، يمنحه دور "student"، وينشئ سجل student_profiles
// داخل معاملة واحدة (transaction) لضمان تناسق البيانات.
func (r *UserRepository) CreateStudent(ctx context.Context, email, passwordHash, displayName string) (*models.User, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var user models.User
	err = tx.QueryRow(ctx, `
		INSERT INTO users (email, password_hash, display_name)
		VALUES ($1, $2, $3)
		RETURNING id, email, display_name, is_active, created_at, updated_at
	`, email, passwordHash, displayName).Scan(
		&user.ID, &user.Email, &user.DisplayName, &user.IsActive, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrDuplicateEmail
		}
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO user_roles (user_id, role_id)
		SELECT $1, id FROM roles WHERE name = 'student'
	`, user.ID)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `INSERT INTO student_profiles (user_id) VALUES ($1)`, user.ID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &user, nil
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.db.QueryRow(ctx, `
		SELECT id, email, password_hash, display_name, is_active, email_verified_at, created_at, updated_at
		FROM users WHERE email = $1 AND deleted_at IS NULL
	`, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.DisplayName, &user.IsActive, &user.EmailVerifiedAt, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindByID(ctx context.Context, id string) (*models.User, error) {
	var user models.User
	err := r.db.QueryRow(ctx, `
		SELECT id, email, password_hash, display_name, is_active, email_verified_at, created_at, updated_at
		FROM users WHERE id = $1 AND deleted_at IS NULL
	`, id).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.DisplayName, &user.IsActive, &user.EmailVerifiedAt, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &user, nil
}

// UpdatePassword يحدّث تجزئة كلمة المرور (التجزئة تتم في طبقة الخدمة).
func (r *UserRepository) UpdatePassword(ctx context.Context, userID, passwordHash string) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE users SET password_hash = $2, updated_at = now()
		WHERE id = $1 AND deleted_at IS NULL
	`, userID, passwordHash)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// CreatePasswordResetToken يخزّن تجزئة رمز الاستعادة (لا الرمز نفسه أبدًا) صالحة لمدة ttl.
func (r *UserRepository) CreatePasswordResetToken(ctx context.Context, userID, tokenHash string, ttl time.Duration) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, now() + $3::interval)
	`, userID, tokenHash, ttl.String())
	return err
}

// ConsumePasswordResetToken يتحقق من صلاحية الرمز، يحدّث كلمة المرور، ويعلّم
// الرمز مستخدَمًا — كل ذلك داخل معاملة واحدة تمنع إعادة استخدام نفس الرمز مرتين.
func (r *UserRepository) ConsumePasswordResetToken(ctx context.Context, tokenHash, newPasswordHash string) (userID string, err error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	err = tx.QueryRow(ctx, `
		SELECT user_id FROM password_reset_tokens
		WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
		FOR UPDATE
	`, tokenHash).Scan(&userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrNotFound
		}
		return "", err
	}

	if _, err := tx.Exec(ctx, `UPDATE password_reset_tokens SET used_at = now() WHERE token_hash = $1`, tokenHash); err != nil {
		return "", err
	}
	if _, err := tx.Exec(ctx, `UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`, userID, newPasswordHash); err != nil {
		return "", err
	}
	if _, err := tx.Exec(ctx, `UPDATE user_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, userID); err != nil {
		return "", err
	}

	return userID, tx.Commit(ctx)
}

// CreateEmailVerificationToken يخزّن تجزئة رمز تفعيل البريد صالحة لمدة ttl.
func (r *UserRepository) CreateEmailVerificationToken(ctx context.Context, userID, tokenHash string, ttl time.Duration) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, now() + $3::interval)
	`, userID, tokenHash, ttl.String())
	return err
}

// ConsumeEmailVerificationToken يتحقق من الرمز ويعلّم البريد مفعَّلًا (email_verified_at)
// ويعلّم الرمز مستخدَمًا حتى لا يُعاد استخدامه.
func (r *UserRepository) ConsumeEmailVerificationToken(ctx context.Context, tokenHash string) (userID string, err error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	err = tx.QueryRow(ctx, `
		SELECT user_id FROM email_verification_tokens
		WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
		FOR UPDATE
	`, tokenHash).Scan(&userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrNotFound
		}
		return "", err
	}

	if _, err := tx.Exec(ctx, `UPDATE email_verification_tokens SET used_at = now() WHERE token_hash = $1`, tokenHash); err != nil {
		return "", err
	}
	if _, err := tx.Exec(ctx, `UPDATE users SET email_verified_at = now(), updated_at = now() WHERE id = $1`, userID); err != nil {
		return "", err
	}

	return userID, tx.Commit(ctx)
}

// GetPrimaryRole يعيد أول دور مرتبط بالمستخدم (student في السياق العادي لواجهة الطالب).
func (r *UserRepository) GetPrimaryRole(ctx context.Context, userID string) (string, error) {
	var role string
	err := r.db.QueryRow(ctx, `
		SELECT r.name FROM roles r
		JOIN user_roles ur ON ur.role_id = r.id
		WHERE ur.user_id = $1
		ORDER BY r.name = 'super_admin' DESC, r.name = 'admin' DESC
		LIMIT 1
	`, userID).Scan(&role)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "student", nil
		}
		return "", err
	}
	return role, nil
}

func (r *UserRepository) GetOnboardingCompleted(ctx context.Context, userID string) (bool, error) {
	var status string
	err := r.db.QueryRow(ctx, `
		SELECT onboarding_status FROM student_profiles WHERE user_id = $1
	`, userID).Scan(&status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, err
	}
	return status == "completed", nil
}

// FindByOAuth يبحث عن مستخدم مرتبط مسبقًا بحساب مزوّد خارجي (Google/Facebook).
func (r *UserRepository) FindByOAuth(ctx context.Context, provider, providerUserID string) (*models.User, error) {
	var user models.User
	err := r.db.QueryRow(ctx, `
		SELECT u.id, u.email, u.password_hash, u.display_name, u.is_active, u.email_verified_at, u.created_at, u.updated_at
		FROM users u JOIN oauth_accounts oa ON oa.user_id = u.id
		WHERE oa.provider = $1 AND oa.provider_user_id = $2 AND u.deleted_at IS NULL
	`, provider, providerUserID).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.DisplayName, &user.IsActive, &user.EmailVerifiedAt, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &user, nil
}

// LinkOAuthAccount يربط حسابًا خارجيًا بمستخدم موجود (idempotent عبر القيد الفريد).
func (r *UserRepository) LinkOAuthAccount(ctx context.Context, userID, provider, providerUserID, email string) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO oauth_accounts (user_id, provider, provider_user_id, email)
		VALUES ($1, $2, $3, NULLIF($4, ''))
		ON CONFLICT (provider, provider_user_id) DO NOTHING
	`, userID, provider, providerUserID, email)
	return err
}

// CreateStudentVerified مثل CreateStudent لكن يعلّم البريد مفعَّلًا فورًا — للحسابات
// المُنشأة عبر تسجيل دخول خارجي (Google/Facebook يضمنان ملكية البريد مسبقًا).
func (r *UserRepository) CreateStudentVerified(ctx context.Context, email, passwordHash, displayName string) (*models.User, error) {
	user, err := r.CreateStudent(ctx, email, passwordHash, displayName)
	if err != nil {
		return nil, err
	}
	if _, err := r.db.Exec(ctx, `UPDATE users SET email_verified_at = now() WHERE id = $1`, user.ID); err != nil {
		return nil, err
	}
	now := time.Now()
	user.EmailVerifiedAt = &now
	return user, nil
}

// isUniqueViolation يتحقق من كود خطأ PostgreSQL 23505 (unique_violation).
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
