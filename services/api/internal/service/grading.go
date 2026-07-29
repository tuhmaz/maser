package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strconv"

	"github.com/alemedu/api/internal/models"
)

var ErrInvalidAnswer = errors.New("invalid answer payload")
var ErrUnsupportedQuestionType = errors.New("unsupported question type")

// Grade يصحّح إجابة سؤال داخل الخادم حصريًا.
// القاعدة الحاكمة (docs/daily-plan-rules.md): لا تعتمد النتيجة على الواجهة أبدًا.
func Grade(q *models.FullQuestion, raw json.RawMessage) (bool, error) {
	switch q.Type {
	case "single_choice", "true_false":
		var payload struct {
			OptionID string `json:"optionId"`
		}
		if err := json.Unmarshal(raw, &payload); err != nil || payload.OptionID == "" {
			return false, ErrInvalidAnswer
		}
		for _, opt := range q.Options {
			if opt.ID == payload.OptionID {
				return opt.IsCorrect, nil
			}
		}
		return false, ErrInvalidAnswer // خيار لا ينتمي لهذا السؤال

	case "multi_select":
		var payload struct {
			OptionIDs []string `json:"optionIds"`
		}
		if err := json.Unmarshal(raw, &payload); err != nil {
			return false, ErrInvalidAnswer
		}
		chosen := map[string]bool{}
		for _, id := range payload.OptionIDs {
			chosen[id] = true
		}
		// يجب اختيار كل الصحيح ولا شيء من الخاطئ
		for _, opt := range q.Options {
			if opt.IsCorrect != chosen[opt.ID] {
				return false, nil
			}
		}
		return true, nil

	case "numeric_input":
		var payload struct {
			Value *float64 `json:"value"`
		}
		if err := json.Unmarshal(raw, &payload); err != nil || payload.Value == nil {
			return false, ErrInvalidAnswer
		}
		if q.NumericValue == nil {
			return false, fmt.Errorf("سؤال عددي بلا إجابة معرفة: %s", q.ID)
		}
		expected, err := strconv.ParseFloat(*q.NumericValue, 64)
		if err != nil {
			return false, fmt.Errorf("إجابة عددية غير صالحة في قاعدة البيانات: %s", q.ID)
		}
		tolerance := 0.0
		if q.Tolerance != nil {
			tolerance = *q.Tolerance
		}
		return math.Abs(*payload.Value-expected) <= tolerance, nil

	case "ordering":
		var payload struct {
			OrderedOptionIDs []string `json:"orderedOptionIds"`
		}
		if err := json.Unmarshal(raw, &payload); err != nil {
			return false, ErrInvalidAnswer
		}
		if len(payload.OrderedOptionIDs) != len(q.Options) {
			return false, nil
		}
		// الترتيب الصحيح هو ترتيب الخيارات حسب حقل "order" المخزن
		correctOrder := make([]string, len(q.Options))
		for i, opt := range q.Options {
			correctOrder[i] = opt.ID // Options محمّلة ORDER BY "order"
		}
		for i := range correctOrder {
			if payload.OrderedOptionIDs[i] != correctOrder[i] {
				return false, nil
			}
		}
		return true, nil

	default:
		// matching وغيرها: تُبنى عند إضافة نموذج أزواج واضح للسؤال
		return false, ErrUnsupportedQuestionType
	}
}
