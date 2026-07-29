package handlers

import (
	"github.com/gofiber/fiber/v2"

	"github.com/alemedu/api/internal/utils"
)

// NotImplemented يُستخدم مؤقتًا للمسارات المعرَّفة في contracts/openapi/openapi.yaml
// والتي لم تُبنَ منطقها بعد، حتى تبقى بنية الـ API مطابقة للعقد الرسمي من اليوم الأول.
//
// ترتيب البناء الفعلي لهذه المسارات موثّق في docs/product-requirements.md
// وفي ترتيب التنفيذ: quiz engine → student progress → mistake notebook → daily plan.
func NotImplemented(c *fiber.Ctx) error {
	return utils.ErrorResponse(c, fiber.StatusNotImplemented, "not_implemented",
		"هذا المسار معرّف في عقد الـ API ولم يُبنَ بعد")
}
