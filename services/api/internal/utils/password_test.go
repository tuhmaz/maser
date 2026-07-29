package utils

import "testing"

func TestHashAndCheckPassword(t *testing.T) {
	hash, err := HashPassword("a-strong-password")
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}
	if hash == "a-strong-password" {
		t.Fatal("password must not be stored as plain text (docs/security-requirements.md)")
	}
	if !CheckPassword(hash, "a-strong-password") {
		t.Fatal("expected correct password to match hash")
	}
	if CheckPassword(hash, "wrong-password") {
		t.Fatal("expected wrong password to not match hash")
	}
}
