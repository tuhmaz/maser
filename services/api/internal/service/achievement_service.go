package service

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/analytics"
)

// AchievementService يمنح الإنجازات — docs/daily-plan-rules.md §نظام الإنجازات:
// "لا تمنح نقاطًا على النقر فقط" و"لا تُنشأ منافسات عامة في النسخة الأولى".
// المنح آمن للاستدعاء المتكرر (idempotent) بفضل المفتاح الأساسي المركّب في
// student_achievements؛ لا حاجة لمنطق "هل هذه أول مرة؟" في طبقة الخدمة.
type AchievementService struct {
	db *pgxpool.Pool
}

func NewAchievementService(db *pgxpool.Pool) *AchievementService {
	return &AchievementService{db: db}
}

var streakThresholds = []struct {
	key   string
	count int
}{
	{"streak_30", 30},
	{"streak_7", 7},
	{"streak_3", 3},
}

// Award يمنح إنجازًا بمفتاحه إن لم يُمنح من قبل. يعيد true إن كان منحًا جديدًا فعليًا.
func (s *AchievementService) Award(ctx context.Context, userID, key string) (bool, error) {
	tag, err := s.db.Exec(ctx, `
		INSERT INTO student_achievements (user_id, achievement_id)
		SELECT $1, id FROM achievements WHERE key = $2
		ON CONFLICT DO NOTHING
	`, userID, key)
	if err != nil {
		return false, err
	}
	newlyEarned := tag.RowsAffected() > 0
	if newlyEarned {
		analytics.Track(ctx, s.db, "achievement_earned", userID, map[string]any{"key": key}, nil)
	}
	return newlyEarned, nil
}

// CheckStreak يمنح كل عتبات سلسلة الأيام التي بلغها الطالب أو تجاوزها — المنح
// المتكرر آمن (idempotent)، فلا ضرر من إعادة فحص عتبة سبق بلوغها.
func (s *AchievementService) CheckStreak(ctx context.Context, userID string, currentStreak int) {
	for _, t := range streakThresholds {
		if currentStreak >= t.count {
			_, _ = s.Award(ctx, userID, t.key)
		}
	}
}
