package utils

import "regexp"

// emailPattern فحص صيغة بسيط ومتشدد بما يكفي: بلا مسافات أو أحرف تحكّم (لا
// يقبل CR/LF ضمن القيمة)، يتطلب @ ونطاقًا بنقطة. لا يعتمد على تحقق الواجهة
// وحدها — "لا تثق بالواجهة الأمامية" (docs/security-requirements.md).
var emailPattern = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]{2,}$`)

// IsValidEmail يتحقق من صيغة بريد إلكتروني أساسية على مستوى الخادم.
func IsValidEmail(email string) bool {
	return len(email) <= 254 && emailPattern.MatchString(email)
}
