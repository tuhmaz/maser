package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/alemedu/api/internal/config"
	"github.com/alemedu/api/internal/models"
	"github.com/alemedu/api/internal/repository"
	"github.com/alemedu/api/internal/utils"
)

var ErrInvalidCredentials = errors.New("invalid credentials")

type AuthService struct {
	cfg      *config.Config
	users    *repository.UserRepository
	sessions *repository.SessionRepository
}

func NewAuthService(cfg *config.Config, users *repository.UserRepository, sessions *repository.SessionRepository) *AuthService {
	return &AuthService{cfg: cfg, users: users, sessions: sessions}
}

type AuthResult struct {
	AccessToken  string
	RefreshToken string
	User         *models.PublicUser
}

func (s *AuthService) Register(ctx context.Context, email, password, displayName, userAgent, ip string) (*AuthResult, error) {
	hash, err := utils.HashPassword(password)
	if err != nil {
		return nil, err
	}

	user, err := s.users.CreateStudent(ctx, email, hash, displayName)
	if err != nil {
		return nil, err
	}

	return s.issueTokens(ctx, user, userAgent, ip)
}

func (s *AuthService) Login(ctx context.Context, email, password, userAgent, ip string) (*AuthResult, error) {
	user, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if !user.IsActive || !utils.CheckPassword(user.PasswordHash, password) {
		return nil, ErrInvalidCredentials
	}

	return s.issueTokens(ctx, user, userAgent, ip)
}

func (s *AuthService) Refresh(ctx context.Context, refreshToken, userAgent, ip string) (*AuthResult, error) {
	userID, err := s.sessions.FindActiveByToken(ctx, refreshToken)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	// دوران رمز التحديث: يُلغى القديم ويُصدَر جديد لتقليل أثر أي تسريب.
	_ = s.sessions.RevokeByToken(ctx, refreshToken)

	return s.issueTokens(ctx, user, userAgent, ip)
}

func (s *AuthService) Logout(ctx context.Context, refreshToken string) error {
	return s.sessions.RevokeByToken(ctx, refreshToken)
}

// ChangePassword يتحقق من كلمة المرور الحالية، يحدّث التجزئة، يلغي كل الجلسات
// القديمة (docs/security-requirements.md: تُلغى الجلسات عند تغيير كلمة المرور)،
// ثم يصدر جلسة جديدة للجهاز الحالي حتى لا يُطرد المستخدم من حسابه.
func (s *AuthService) ChangePassword(ctx context.Context, userID, currentPassword, newPassword, userAgent, ip string) (*AuthResult, error) {
	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if !utils.CheckPassword(user.PasswordHash, currentPassword) {
		return nil, ErrInvalidCredentials
	}

	newHash, err := utils.HashPassword(newPassword)
	if err != nil {
		return nil, err
	}
	if err := s.users.UpdatePassword(ctx, userID, newHash); err != nil {
		return nil, err
	}

	if err := s.sessions.RevokeAllForUser(ctx, userID); err != nil {
		return nil, err
	}

	return s.issueTokens(ctx, user, userAgent, ip)
}

func (s *AuthService) Me(ctx context.Context, userID string) (*models.PublicUser, error) {
	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return s.toPublicUser(ctx, user)
}

func (s *AuthService) issueTokens(ctx context.Context, user *models.User, userAgent, ip string) (*AuthResult, error) {
	role, err := s.users.GetPrimaryRole(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	accessToken, err := utils.GenerateAccessToken(s.cfg.JWTAccessSecret, user.ID, role, s.cfg.JWTAccessTTLMinutes)
	if err != nil {
		return nil, err
	}

	refreshToken, err := generateOpaqueToken()
	if err != nil {
		return nil, err
	}

	ttl := time.Duration(s.cfg.JWTRefreshTTLDays) * 24 * time.Hour
	if err := s.sessions.Create(ctx, user.ID, refreshToken, userAgent, ip, ttl); err != nil {
		return nil, err
	}

	publicUser, err := s.toPublicUser(ctx, user)
	if err != nil {
		return nil, err
	}
	publicUser.Role = role

	return &AuthResult{AccessToken: accessToken, RefreshToken: refreshToken, User: publicUser}, nil
}

func (s *AuthService) toPublicUser(ctx context.Context, user *models.User) (*models.PublicUser, error) {
	role, err := s.users.GetPrimaryRole(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	onboarded, err := s.users.GetOnboardingCompleted(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	return &models.PublicUser{
		ID:                  user.ID,
		Email:               user.Email,
		DisplayName:         user.DisplayName,
		Role:                role,
		OnboardingCompleted: onboarded,
	}, nil
}

func generateOpaqueToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
