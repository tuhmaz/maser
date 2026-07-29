package utils

import "golang.org/x/crypto/bcrypt"

// HashPassword يشفّر كلمة المرور. لا تُخزَّن كلمات المرور كنص مباشر أبدًا
// (راجع docs/security-requirements.md).
func HashPassword(plain string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// CheckPassword يقارن كلمة مرور نصية بتجزئتها المخزنة.
func CheckPassword(hash, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}
