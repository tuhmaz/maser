package models

import "time"

// User يطابق جدول users في 0001_auth.up.sql
type User struct {
	ID              string     `json:"id"`
	Email           string     `json:"email"`
	PasswordHash    string     `json:"-"`
	DisplayName     string     `json:"displayName"`
	IsActive        bool       `json:"isActive"`
	EmailVerifiedAt *time.Time `json:"emailVerifiedAt,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

// PublicUser هو الشكل الذي يُرسَل في استجابات الـ API (يطابق مخطط User في OpenAPI).
type PublicUser struct {
	ID                  string `json:"id"`
	Email               string `json:"email"`
	DisplayName         string `json:"displayName"`
	Role                string `json:"role"`
	OnboardingCompleted bool   `json:"onboardingCompleted"`
	EmailVerified       bool   `json:"emailVerified"`
}
