package main

import (
	"log"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"github.com/alemedu/api/internal/cache"
	"github.com/alemedu/api/internal/config"
	"github.com/alemedu/api/internal/database"
	"github.com/alemedu/api/internal/router"
)

func main() {
	cfg := config.Load()

	db, err := database.New(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("فشل الاتصال بقاعدة البيانات: %v", err)
	}
	defer db.Close()

	app := fiber.New(fiber.Config{
		AppName:               "Alemedu API",
		DisableStartupMessage: false,
	})

	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(helmet.New(helmet.Config{
		// الافتراضي "same-origin" يمنع متصفح تطبيقي الطالب/الإدارة (منفذان مختلفان)
		// من عرض صور العلامة التجارية/الأسئلة المرفوعة على هذا الخادم.
		CrossOriginResourcePolicy: "cross-origin",
	})) // رؤوس أمنية: X-Frame-Options, X-Content-Type-Options, CSP أساسي، إلخ
	app.Use(cors.New(cors.Config{
		AllowOrigins:     strings.Join(cfg.CORSAllowedOrigins, ","),
		AllowCredentials: true,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
	}))

	var redisStorage fiber.Storage
	if cfg.RedisURL != "" {
		redisStorage = cache.NewStorage(cfg.RedisURL)
	}

	router.Setup(app, cfg, db, redisStorage)

	log.Printf("Alemedu API يعمل على المنفذ %s (env=%s)", cfg.AppPort, cfg.AppEnv)
	if err := app.Listen(":" + cfg.AppPort); err != nil {
		log.Fatalf("فشل تشغيل الخادم: %v", err)
	}
}
