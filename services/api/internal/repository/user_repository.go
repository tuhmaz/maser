package repository

import (
	"context"
	"errors"

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
		SELECT id, email, password_hash, display_name, is_active, created_at, updated_at
		FROM users WHERE email = $1 AND deleted_at IS NULL
	`, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.DisplayName, &user.IsActive, &user.CreatedAt, &user.UpdatedAt,
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
		SELECT id, email, password_hash, display_name, is_active, created_at, updated_at
		FROM users WHERE id = $1 AND deleted_at IS NULL
	`, id).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.DisplayName, &user.IsActive, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &user, nil
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

// isUniqueViolation يتحقق من كود خطأ PostgreSQL 23505 (unique_violation).
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
