package utils

import "testing"

func TestGenerateAndParseAccessToken(t *testing.T) {
	token, err := GenerateAccessToken("test-secret", "user-123", "student", 15)
	if err != nil {
		t.Fatalf("GenerateAccessToken failed: %v", err)
	}

	claims, err := ParseAccessToken("test-secret", token)
	if err != nil {
		t.Fatalf("ParseAccessToken failed: %v", err)
	}
	if claims.UserID != "user-123" || claims.Role != "student" {
		t.Fatalf("unexpected claims: %+v", claims)
	}
}

func TestParseAccessToken_WrongSecret(t *testing.T) {
	token, err := GenerateAccessToken("test-secret", "user-123", "student", 15)
	if err != nil {
		t.Fatalf("GenerateAccessToken failed: %v", err)
	}

	if _, err := ParseAccessToken("other-secret", token); err == nil {
		t.Fatal("expected error when parsing token with wrong secret (tampering must be rejected)")
	}
}
