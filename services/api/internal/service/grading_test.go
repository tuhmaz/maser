package service

import (
	"encoding/json"
	"testing"

	"github.com/alemedu/api/internal/models"
)

func singleChoiceQuestion() *models.FullQuestion {
	return &models.FullQuestion{
		ID:   "q1",
		Type: "single_choice",
		Options: []models.QuestionOption{
			{ID: "a", Text: "خيار أ", Order: 1, IsCorrect: false},
			{ID: "b", Text: "خيار ب", Order: 2, IsCorrect: true},
			{ID: "c", Text: "خيار ج", Order: 3, IsCorrect: false},
		},
	}
}

func TestGrade_SingleChoice(t *testing.T) {
	q := singleChoiceQuestion()

	correct, err := Grade(q, json.RawMessage(`{"optionId":"b"}`))
	if err != nil || !correct {
		t.Fatalf("expected correct answer, got correct=%v err=%v", correct, err)
	}

	correct, err = Grade(q, json.RawMessage(`{"optionId":"a"}`))
	if err != nil || correct {
		t.Fatalf("expected wrong answer, got correct=%v err=%v", correct, err)
	}

	if _, err = Grade(q, json.RawMessage(`{"optionId":"zzz"}`)); err == nil {
		t.Fatal("expected error for option not belonging to question")
	}

	if _, err = Grade(q, json.RawMessage(`{}`)); err == nil {
		t.Fatal("expected error for missing optionId")
	}
}

func TestGrade_MultiSelect(t *testing.T) {
	q := &models.FullQuestion{
		ID:   "q2",
		Type: "multi_select",
		Options: []models.QuestionOption{
			{ID: "a", IsCorrect: true},
			{ID: "b", IsCorrect: true},
			{ID: "c", IsCorrect: false},
		},
	}

	correct, _ := Grade(q, json.RawMessage(`{"optionIds":["a","b"]}`))
	if !correct {
		t.Fatal("expected all-correct selection to pass")
	}

	correct, _ = Grade(q, json.RawMessage(`{"optionIds":["a"]}`))
	if correct {
		t.Fatal("expected partial selection to fail")
	}

	correct, _ = Grade(q, json.RawMessage(`{"optionIds":["a","b","c"]}`))
	if correct {
		t.Fatal("expected selection including wrong option to fail")
	}
}

func TestGrade_NumericInput(t *testing.T) {
	value := "12.5"
	tolerance := 0.1
	q := &models.FullQuestion{ID: "q3", Type: "numeric_input", NumericValue: &value, Tolerance: &tolerance}

	correct, _ := Grade(q, json.RawMessage(`{"value":12.55}`))
	if !correct {
		t.Fatal("expected value within tolerance to pass")
	}

	correct, _ = Grade(q, json.RawMessage(`{"value":13}`))
	if correct {
		t.Fatal("expected value outside tolerance to fail")
	}

	if _, err := Grade(q, json.RawMessage(`{}`)); err == nil {
		t.Fatal("expected error for missing value")
	}
}

func TestGrade_Ordering(t *testing.T) {
	q := &models.FullQuestion{
		ID:   "q4",
		Type: "ordering",
		Options: []models.QuestionOption{
			{ID: "s1", Order: 1},
			{ID: "s2", Order: 2},
			{ID: "s3", Order: 3},
		},
	}

	correct, _ := Grade(q, json.RawMessage(`{"orderedOptionIds":["s1","s2","s3"]}`))
	if !correct {
		t.Fatal("expected correct order to pass")
	}

	correct, _ = Grade(q, json.RawMessage(`{"orderedOptionIds":["s2","s1","s3"]}`))
	if correct {
		t.Fatal("expected wrong order to fail")
	}
}
