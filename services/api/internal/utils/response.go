package utils

import "github.com/gofiber/fiber/v2"

// ErrorResponse يطابق الشكل الموحد لرسائل الخطأ في docs/api-contract.md:
// { "error": { "code", "message" } }
func ErrorResponse(c *fiber.Ctx, status int, code, message string) error {
	return c.Status(status).JSON(fiber.Map{
		"error": fiber.Map{
			"code":    code,
			"message": message,
		},
	})
}
