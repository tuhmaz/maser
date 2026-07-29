package models

import (
	"encoding/json"
	"time"
)

// QuestionOption خيار واحد ضمن سؤال. IsCorrect و WrongReason لا يُرسَلان
// أبدًا للطالب قبل التسليم (docs/daily-plan-rules.md).
type QuestionOption struct {
	ID          string `json:"id"`
	Text        string `json:"text"`
	Order       int    `json:"order"`
	IsCorrect   bool   `json:"isCorrect,omitempty"`
	WrongReason string `json:"wrongReason,omitempty"`
}

// FullQuestion النسخة الكاملة (تُستخدم داخليًا للتصحيح وتُحفظ snapshot في المحاولة).
type FullQuestion struct {
	ID           string           `json:"id"`
	VersionID    string           `json:"versionId"`
	Type         string           `json:"type"`
	Body         string           `json:"body"`
	Explanation  string           `json:"explanation,omitempty"`
	Options      []QuestionOption `json:"options,omitempty"`
	NumericValue *string          `json:"numericValue,omitempty"` // للأسئلة العددية
	Tolerance    *float64         `json:"tolerance,omitempty"`
	SkillIDs     []string         `json:"skillIds"`
}

// SanitizedOption ما يراه الطالب أثناء الحل.
type SanitizedOption struct {
	ID    string `json:"id"`
	Text  string `json:"text"`
	Order int    `json:"order"`
}

// SanitizedQuestion سؤال بلا إجابات صحيحة — الشكل الوحيد المسموح إرساله قبل التسليم.
type SanitizedQuestion struct {
	ID       string            `json:"id"`
	Type     string            `json:"type"`
	Body     string            `json:"body"`
	Options  []SanitizedOption `json:"options,omitempty"`
	Answered bool              `json:"answered"`
}

func (q *FullQuestion) Sanitized(answered bool) SanitizedQuestion {
	opts := make([]SanitizedOption, 0, len(q.Options))
	for _, o := range q.Options {
		opts = append(opts, SanitizedOption{ID: o.ID, Text: o.Text, Order: o.Order})
	}
	return SanitizedQuestion{ID: q.ID, Type: q.Type, Body: q.Body, Options: opts, Answered: answered}
}

// Attempt محاولة اختبار.
type Attempt struct {
	ID            string     `json:"id"`
	UserID        string     `json:"-"`
	QuizID        *string    `json:"quizId,omitempty"`
	Type          string     `json:"type"`
	Status        string     `json:"status"`
	QuestionOrder []string   `json:"questionOrder"`
	StartedAt     time.Time  `json:"startedAt"`
	SubmittedAt   *time.Time `json:"submittedAt,omitempty"`
}

// SkillResult نتيجة مهارة واحدة ضمن تقرير المحاولة، مع تفسير مفهوم
// (شرط قبول docs/mastery-model.md: لا رقم غامض دون تفسير).
type SkillResult struct {
	SkillID   string `json:"skillId"`
	SkillName string `json:"skillName"`
	Correct   int    `json:"correct"`
	Total     int    `json:"total"`
	NewState  string `json:"newState"`
	Reason    string `json:"reason"`
}

// AttemptResult تقرير المحاولة النهائي (يُحسَب داخل الخادم فقط).
type AttemptResult struct {
	AttemptID      string        `json:"attemptId"`
	Score          float64       `json:"score"`
	CorrectCount   int           `json:"correctCount"`
	TotalCount     int           `json:"totalCount"`
	SkillBreakdown []SkillResult `json:"skillBreakdown"`
}

// AnswerPayload الإجابة المرسلة من الطالب — الشكل يعتمد على نوع السؤال:
//   single_choice / true_false: {"optionId": "..."}
//   multi_select:               {"optionIds": ["...", ...]}
//   numeric_input:              {"value": 12.5}
//   ordering:                   {"orderedOptionIds": ["...", ...]}
type AnswerPayload = json.RawMessage
