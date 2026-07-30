package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/config"
	"github.com/alemedu/api/internal/handlers"
	"github.com/alemedu/api/internal/middleware"
	"github.com/alemedu/api/internal/repository"
	"github.com/alemedu/api/internal/service"
)

// Setup يوصل كل المسارات المعرَّفة في contracts/openapi/openapi.yaml بمعالجاتها.
// المسارات التي لم تُبنَ منطقها بعد تُوصَل مؤقتًا بـ handlers.NotImplemented
// حتى يبقى شكل الـ API مطابقًا للعقد الرسمي من أول يوم.
func Setup(app *fiber.App, cfg *config.Config, db *pgxpool.Pool) {
	userRepo := repository.NewUserRepository(db)
	sessionRepo := repository.NewSessionRepository(db)
	questionRepo := repository.NewQuestionRepository(db)
	attemptRepo := repository.NewAttemptRepository(db)
	learningRepo := repository.NewLearningRepository(db)

	authService := service.NewAuthService(cfg, userRepo, sessionRepo)
	quizService := service.NewQuizService(db, questionRepo, attemptRepo, learningRepo)

	authHandler := handlers.NewAuthHandler(authService)
	curriculumHandler := handlers.NewCurriculumHandler(db)
	onboardingHandler := handlers.NewOnboardingHandler(db)
	quizHandler := handlers.NewQuizHandler(quizService)
	progressHandler := handlers.NewProgressHandler(db)
	mistakesHandler := handlers.NewMistakesHandler(db, learningRepo)

	requireAuth := middleware.RequireAuth(cfg.JWTAccessSecret)
	requireAdmin := middleware.RequireRole("admin", "super_admin")

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	// --- المصادقة ---
	auth := app.Group("/auth")
	auth.Post("/register", authHandler.Register)
	auth.Post("/login", authHandler.Login)
	auth.Post("/logout", authHandler.Logout)
	auth.Post("/refresh", authHandler.Refresh)
	auth.Post("/forgot-password", authHandler.ForgotPassword)
	auth.Post("/reset-password", authHandler.ResetPassword)
	auth.Get("/me", requireAuth, authHandler.Me)
	auth.Post("/change-password", requireAuth, authHandler.ChangePassword)

	// --- التهيئة ---
	onboarding := app.Group("/onboarding", requireAuth)
	onboarding.Get("/options", onboardingHandler.Options)
	onboarding.Post("/complete", onboardingHandler.Complete)

	// --- المنهاج (قراءة عامة، لا تتطلب مصادقة) ---
	app.Get("/grades", curriculumHandler.ListGrades)
	app.Get("/grades/:gradeId/subjects", curriculumHandler.ListSubjectsForGrade)
	app.Get("/subjects/:subjectId", curriculumHandler.GetSubject)
	app.Get("/subjects/:subjectId/units", curriculumHandler.ListUnits)
	app.Get("/units/:unitId/lessons", curriculumHandler.ListLessons)
	app.Get("/lessons/:lessonId", curriculumHandler.GetLesson)

	// --- الاختبارات (محرك الاختبارات) ---
	app.Post("/diagnostic/start", requireAuth, quizHandler.StartDiagnostic)
	app.Post("/quizzes/:quizId/start", requireAuth, quizHandler.StartQuiz)
	app.Get("/attempts/:attemptId", requireAuth, quizHandler.GetAttempt)
	app.Post("/attempts/:attemptId/answers", requireAuth, quizHandler.SaveAnswer)
	app.Post("/attempts/:attemptId/submit", requireAuth, quizHandler.Submit)
	app.Get("/attempts/:attemptId/result", requireAuth, quizHandler.GetResult)

	// --- التقدم ---
	progress := app.Group("/progress", requireAuth)
	progress.Get("/", progressHandler.Overview)
	progress.Get("/subjects/:subjectId", handlers.NotImplemented) // يُبنى مع خريطة المادة التفصيلية
	progress.Get("/skills", progressHandler.Skills)
	progress.Get("/skills/:skillId", progressHandler.Skill)

	// --- دفتر الأخطاء ---
	mistakes := app.Group("/mistakes", requireAuth)
	mistakes.Get("/", mistakesHandler.List)
	mistakes.Get("/due", mistakesHandler.Due)
	mistakes.Post("/:mistakeId/review", mistakesHandler.Review)

	// --- المهمة اليومية ---
	app.Get("/daily-plan", requireAuth, handlers.NotImplemented)
	app.Post("/daily-plan/generate", requireAuth, handlers.NotImplemented)
	app.Post("/daily-tasks/:taskId/start", requireAuth, handlers.NotImplemented)
	app.Post("/daily-tasks/:taskId/complete", requireAuth, handlers.NotImplemented)

	// --- الإدارة (تتطلب دور admin أو super_admin) ---
	admin := app.Group("/admin", requireAuth, requireAdmin)
	admin.All("/curricula/*", handlers.NotImplemented)
	admin.All("/subjects/*", handlers.NotImplemented)
	admin.All("/lessons/*", handlers.NotImplemented)
	admin.All("/skills/*", handlers.NotImplemented)
	admin.All("/questions/*", handlers.NotImplemented)
	admin.All("/quizzes/*", handlers.NotImplemented)
	admin.All("/reviews/*", handlers.NotImplemented)
	admin.All("/users/*", handlers.NotImplemented)
	admin.All("/reports/*", handlers.NotImplemented)
}
