package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/config"
	"github.com/alemedu/api/internal/email"
	"github.com/alemedu/api/internal/models"
	"github.com/alemedu/api/internal/repository"
	"github.com/alemedu/api/internal/utils"
)

var ErrInvalidCredentials = errors.New("invalid credentials")

const (
	passwordResetTTL     = 1 * time.Hour
	emailVerificationTTL = 24 * time.Hour
)

type AuthService struct {
	cfg            *config.Config
	db             *pgxpool.Pool // لبناء مُرسِل البريد ديناميكيًا من إعدادات الموقع عند كل إرسال
	users          *repository.UserRepository
	sessions       *repository.SessionRepository
	mailerFallback email.Config
}

func NewAuthService(cfg *config.Config, db *pgxpool.Pool, users *repository.UserRepository, sessions *repository.SessionRepository, mailerFallback email.Config) *AuthService {
	return &AuthService{cfg: cfg, db: db, users: users, sessions: sessions, mailerFallback: mailerFallback}
}

// mailer يبني مُرسِلًا طازجًا من إعدادات site_settings الحالية — يعكس أي تغيير
// أجراه الأدمن من لوحة الإعدادات فورًا دون إعادة تشغيل الخادم.
func (s *AuthService) mailer(ctx context.Context) *email.Sender {
	return email.FromDB(ctx, s.db, s.mailerFallback)
}

type AuthResult struct {
	AccessToken  string
	RefreshToken string
	User         *models.PublicUser
}

// Register ينشئ حسابًا ويرسل رابط تفعيل البريد (docs الجديدة: تفعيل الإيميل عند
// إنشاء الحساب). لا يمنع الدخول قبل التفعيل — التفعيل إثبات ملكية بريد، وليس بوابة أمان صارمة هنا.
func (s *AuthService) Register(ctx context.Context, emailAddr, password, displayName, userAgent, ip string) (*AuthResult, error) {
	hash, err := utils.HashPassword(password)
	if err != nil {
		return nil, err
	}

	user, err := s.users.CreateStudent(ctx, emailAddr, hash, displayName)
	if err != nil {
		return nil, err
	}

	s.sendVerificationEmail(ctx, user)

	return s.issueTokens(ctx, user, userAgent, ip)
}

func (s *AuthService) sendVerificationEmail(ctx context.Context, user *models.User) {
	rawToken, err := generateOpaqueToken()
	if err != nil {
		return
	}
	if err := s.users.CreateEmailVerificationToken(ctx, user.ID, hashResetToken(rawToken), emailVerificationTTL); err != nil {
		return
	}
	verifyURL := fmt.Sprintf("%s/verify-email?token=%s", s.cfg.WebBaseURL, rawToken)
	_ = s.mailer(ctx).SendVerification(user.Email, verifyURL)
}

// VerifyEmail يستهلك رمز التفعيل ويعلّم البريد موثَّقًا.
func (s *AuthService) VerifyEmail(ctx context.Context, rawToken string) error {
	_, err := s.users.ConsumeEmailVerificationToken(ctx, hashResetToken(rawToken))
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return ErrInvalidCredentials
		}
		return err
	}
	return nil
}

// ResendVerification يعيد إرسال رابط التفعيل لمستخدم مسجَّل دخوله لم يفعِّل بريده بعد.
func (s *AuthService) ResendVerification(ctx context.Context, userID string) error {
	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return err
	}
	if user.EmailVerifiedAt != nil {
		return nil // مفعَّل مسبقًا: لا حاجة لإرسال جديد
	}
	s.sendVerificationEmail(ctx, user)
	return nil
}

func (s *AuthService) Login(ctx context.Context, emailAddr, password, userAgent, ip string) (*AuthResult, error) {
	user, err := s.users.FindByEmail(ctx, emailAddr)
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
	// Login يتحقق من is_active، لكن Refresh لم يكن يتحقق منها — حساب عُطِّل
	// بعد إصدار جلسته كان يستطيع تجديد رمز الوصول إلى ما لا نهاية طالما
	// يحتفظ بـ refresh token صالح. نُلغي كل جلساته أيضًا حتى لا يُعاد المحاولة.
	if !user.IsActive {
		_ = s.sessions.RevokeAllForUser(ctx, userID)
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

// ForgotPassword يرسل رابط استعادة إن كان البريد مسجَّلًا. لا يكشف للمتصل ما
// إذا كان الحساب موجودًا أم لا (نفس السلوك دائمًا) — docs/api-contract.md.
func (s *AuthService) ForgotPassword(ctx context.Context, emailAddr string) {
	user, err := s.users.FindByEmail(ctx, emailAddr)
	if err != nil {
		return // بريد غير مسجَّل: لا شيء يُرسَل، ولا فرق ملحوظ من الخارج
	}

	rawToken, err := generateOpaqueToken()
	if err != nil {
		return
	}
	tokenHash := hashResetToken(rawToken)
	if err := s.users.CreatePasswordResetToken(ctx, user.ID, tokenHash, passwordResetTTL); err != nil {
		return
	}

	resetURL := fmt.Sprintf("%s/reset-password?token=%s", s.cfg.WebBaseURL, rawToken)
	_ = s.mailer(ctx).SendPasswordReset(user.Email, resetURL)
}

// ResetPassword يستهلك رمز الاستعادة، يحدّث كلمة المرور، ويلغي كل الجلسات القديمة.
func (s *AuthService) ResetPassword(ctx context.Context, rawToken, newPassword string) error {
	newHash, err := utils.HashPassword(newPassword)
	if err != nil {
		return err
	}
	_, err = s.users.ConsumePasswordResetToken(ctx, hashResetToken(rawToken), newHash)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return ErrInvalidCredentials
		}
		return err
	}
	return nil
}

func hashResetToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
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
		EmailVerified:       user.EmailVerifiedAt != nil,
	}, nil
}

// FindOrCreateFromOAuth يبحث عن مستخدم مرتبط بحساب Google/Facebook، أو ينشئ
// حسابًا جديدًا موثَّق البريد فورًا (المزوّد يضمن ملكية البريد) ويربطه.
// بريد مسجَّل مسبقًا بكلمة مرور يُربَط بنفس الحساب بدل إنشاء مكرَّر.
func (s *AuthService) FindOrCreateFromOAuth(ctx context.Context, provider, providerUserID, emailAddr, displayName, userAgent, ip string) (*AuthResult, error) {
	if user, err := s.users.FindByOAuth(ctx, provider, providerUserID); err == nil {
		return s.issueTokens(ctx, user, userAgent, ip)
	} else if !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}

	user, err := s.users.FindByEmail(ctx, emailAddr)
	if err != nil {
		if !errors.Is(err, repository.ErrNotFound) {
			return nil, err
		}
		randomPassword, genErr := generateOpaqueToken()
		if genErr != nil {
			return nil, genErr
		}
		hash, hashErr := utils.HashPassword(randomPassword)
		if hashErr != nil {
			return nil, hashErr
		}
		user, err = s.users.CreateStudentVerified(ctx, emailAddr, hash, displayName)
		if err != nil {
			return nil, err
		}
	}

	if err := s.users.LinkOAuthAccount(ctx, user.ID, provider, providerUserID, emailAddr); err != nil {
		return nil, err
	}
	return s.issueTokens(ctx, user, userAgent, ip)
}

func generateOpaqueToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
