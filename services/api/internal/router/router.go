package router

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/config"
	"github.com/alemedu/api/internal/email"
	"github.com/alemedu/api/internal/handlers"
	"github.com/alemedu/api/internal/middleware"
	"github.com/alemedu/api/internal/repository"
	"github.com/alemedu/api/internal/service"
	"github.com/alemedu/api/internal/utils"
)

// Setup يوصل كل المسارات المعرَّفة في contracts/openapi/openapi.yaml بمعالجاتها.
// المسارات التي لم تُبنَ منطقها بعد تُوصَل مؤقتًا بـ handlers.NotImplemented
// حتى يبقى شكل الـ API مطابقًا للعقد الرسمي من أول يوم.
//
// redisStorage قد تكون nil (لم يُضبط REDIS_URL) — عندها يعود محدِّد المعدل
// لمخزن في-الذاكرة تلقائيًا (آمن لتطوير محلي فقط، لا يصلح لعدة نسخ من الخادم).
func Setup(app *fiber.App, cfg *config.Config, db *pgxpool.Pool, redisStorage fiber.Storage) {
	userRepo := repository.NewUserRepository(db)
	sessionRepo := repository.NewSessionRepository(db)
	questionRepo := repository.NewQuestionRepository(db)
	attemptRepo := repository.NewAttemptRepository(db)
	learningRepo := repository.NewLearningRepository(db)

	mailer := email.NewSender(email.Config{
		Host: cfg.SMTPHost, Port: cfg.SMTPPort, Username: cfg.SMTPUser, Password: cfg.SMTPPass, From: cfg.SMTPFrom,
	})

	achievementService := service.NewAchievementService(db)
	authService := service.NewAuthService(cfg, userRepo, sessionRepo, mailer)
	quizService := service.NewQuizService(db, questionRepo, attemptRepo, learningRepo, achievementService)
	dailyPlanService := service.NewDailyPlanService(db, quizService)

	authHandler := handlers.NewAuthHandler(authService, db)
	curriculumHandler := handlers.NewCurriculumHandler(db)
	onboardingHandler := handlers.NewOnboardingHandler(db)
	quizHandler := handlers.NewQuizHandler(quizService, db)
	progressHandler := handlers.NewProgressHandler(db)
	mistakesHandler := handlers.NewMistakesHandler(db, learningRepo, achievementService)
	dailyPlanHandler := handlers.NewDailyPlanHandler(dailyPlanService, achievementService, db)
	achievementsHandler := handlers.NewAchievementsHandler(db)
	parentHandler := handlers.NewParentHandler(db)
	redirectHandler := handlers.NewRedirectHandler(db, cfg)
	uploadsHandler := handlers.NewUploadsHandler(db, cfg.StorageDir, cfg.PublicAssetURL)
	featureFlagsHandler := handlers.NewFeatureFlagsHandler(db)

	adminCurriculumHandler := handlers.NewAdminCurriculumHandler(db)
	adminGradesSubjectsHandler := handlers.NewAdminGradesSubjectsHandler(db)
	adminQuestionsHandler := handlers.NewAdminQuestionsHandler(db)
	adminUsersHandler := handlers.NewAdminUsersHandler(db)
	adminReportsHandler := handlers.NewAdminReportsHandler(db)

	requireAuth := middleware.RequireAuth(cfg.JWTAccessSecret)
	requireAdmin := middleware.RequireRole("admin", "super_admin")

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	// خدمة الملفات المرفوعة (صور الأسئلة) كملفات ثابتة — docs/database-design.md.
	app.Static("/assets", cfg.StorageDir)

	// الربط مع موقع الإيمان (docs/analytics-events.md) — لا يتطلب مصادقة.
	app.Get("/r", redirectHandler.FromAlemancenter)

	// أعلام الميزات العامة (docs/deployment-plan.md: إيقاف ميزة فورًا دون نشر جديد).
	app.Get("/feature-flags", featureFlagsHandler.PublicList)

	// --- المصادقة (rate limiting: 20 طلب/دقيقة لكل IP على المسارات الحساسة) ---
	authLimiter := limiter.New(limiter.Config{
		Max:        20,
		Expiration: time.Minute,
		Storage:    redisStorage,
		LimitReached: func(c *fiber.Ctx) error {
			return utils.ErrorResponse(c, fiber.StatusTooManyRequests, "rate_limited", "محاولات كثيرة جدًا — حاول مجددًا بعد قليل")
		},
	})

	auth := app.Group("/auth")
	auth.Post("/register", authLimiter, authHandler.Register)
	auth.Post("/login", authLimiter, authHandler.Login)
	auth.Post("/logout", authHandler.Logout)
	auth.Post("/refresh", authHandler.Refresh)
	auth.Post("/forgot-password", authLimiter, authHandler.ForgotPassword)
	auth.Post("/reset-password", authLimiter, authHandler.ResetPassword)
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
	app.Get("/lessons/:lessonId/quiz", curriculumHandler.GetLessonQuiz)

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
	progress.Get("/subjects/:subjectId", progressHandler.Subject)
	progress.Get("/skills", progressHandler.Skills)
	progress.Get("/skills/:skillId", progressHandler.Skill)

	// --- دفتر الأخطاء ---
	mistakes := app.Group("/mistakes", requireAuth)
	mistakes.Get("/", mistakesHandler.List)
	mistakes.Get("/due", mistakesHandler.Due)
	mistakes.Post("/:mistakeId/review", mistakesHandler.Review)

	// --- المهمة اليومية ---
	app.Get("/daily-plan", requireAuth, dailyPlanHandler.GetToday)
	app.Post("/daily-plan/generate", requireAuth, dailyPlanHandler.Generate)
	app.Post("/daily-tasks/:taskId/start", requireAuth, dailyPlanHandler.StartTask)
	app.Post("/daily-tasks/:taskId/complete", requireAuth, dailyPlanHandler.CompleteTask)

	// --- الإنجازات ---
	app.Get("/achievements", requireAuth, achievementsHandler.List)

	// --- ولي الأمر ---
	parent := app.Group("/parent", requireAuth)
	parent.Post("/link-requests", parentHandler.RequestLink)
	parent.Get("/link-requests/incoming", parentHandler.IncomingRequests)
	parent.Post("/link-requests/:parentId/respond", parentHandler.RespondToRequest)
	parent.Get("/children", parentHandler.Children)

	// --- الإدارة (تتطلب دور admin أو super_admin) ---
	admin := app.Group("/admin", requireAuth, requireAdmin)

	admin.Get("/curricula/grades", adminGradesSubjectsHandler.ListGrades)
	admin.Post("/curricula/grades", adminGradesSubjectsHandler.CreateGrade)
	admin.Post("/curricula/subjects", adminGradesSubjectsHandler.CreateSubject)

	admin.Get("/units", adminCurriculumHandler.ListUnits)
	admin.Post("/units", adminCurriculumHandler.CreateUnit)
	admin.Put("/units/:id", adminCurriculumHandler.UpdateUnit)

	admin.Get("/lessons", adminCurriculumHandler.ListLessons)
	admin.Post("/lessons", adminCurriculumHandler.CreateLesson)
	admin.Put("/lessons/:id", adminCurriculumHandler.UpdateLesson)

	admin.Get("/skills", adminCurriculumHandler.ListSkills)
	admin.Post("/skills", adminCurriculumHandler.CreateSkill)
	admin.Put("/skills/:id", adminCurriculumHandler.UpdateSkill)

	admin.Get("/quizzes", adminCurriculumHandler.ListQuizzes) // للقراءة فقط: تُنشأ تلقائيًا عند النشر

	admin.Get("/questions", adminQuestionsHandler.List)
	admin.Post("/questions", adminQuestionsHandler.Create)
	admin.Get("/questions/:id", adminQuestionsHandler.Get)
	admin.Put("/questions/:id", adminQuestionsHandler.Update)
	admin.Delete("/questions/:id", adminQuestionsHandler.Delete)
	admin.Post("/questions/:id/submit-review", adminQuestionsHandler.SubmitForReview)
	admin.Post("/questions/:id/review", adminQuestionsHandler.Review)
	admin.Post("/questions/:id/publish", adminQuestionsHandler.Publish)
	admin.Post("/questions/:id/archive", adminQuestionsHandler.Archive)
	admin.Post("/questions/:id/media", uploadsHandler.UploadQuestionMedia)
	admin.Get("/questions/:id/media", uploadsHandler.ListQuestionMedia)

	// "المراجعات" ليست كيانًا منفصلاً — هي أسئلة بحالة in_review، تُدار بنفس مسارات /admin/questions
	admin.Get("/reviews", func(c *fiber.Ctx) error {
		c.Request().URI().QueryArgs().Set("status", "in_review")
		return adminQuestionsHandler.List(c)
	})

	admin.Get("/users", adminUsersHandler.List)
	admin.Put("/users/:id/role", adminUsersHandler.ChangeRole)

	admin.Get("/feature-flags", featureFlagsHandler.AdminList)
	admin.Put("/feature-flags/:key", featureFlagsHandler.AdminUpdate)

	admin.Get("/reports/overview", adminReportsHandler.Overview)
	admin.Get("/reports/content-issues", adminReportsHandler.ListContentIssues)
	admin.Post("/reports/content-issues/:id/resolve", adminReportsHandler.ResolveContentIssue)
	admin.Get("/reports/audit-logs", adminReportsHandler.ListAuditLogs)
}
