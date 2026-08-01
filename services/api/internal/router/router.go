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
	"github.com/alemedu/api/internal/storage"
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
	permissionRepo := repository.NewPermissionRepository(db)
	aiJobRepo := repository.NewAIJobRepository(db)

	mailerFallback := email.Config{
		Host: cfg.SMTPHost, Port: cfg.SMTPPort, Username: cfg.SMTPUser, Password: cfg.SMTPPass,
		From: cfg.SMTPFrom, FromName: cfg.SMTPFromName,
	}
	settingsRepo := repository.NewSettingsRepository(db)

	// تخزين محلي حاليًا؛ يمكن استبداله بتنفيذ S3 لاحقًا (docs/ai-curriculum-roadmap.md
	// — E03) دون تغيير أي معالج يستهلك storage.Storage أدناه.
	localStorage := storage.NewLocal(cfg.StorageDir, cfg.PublicAssetURL)

	achievementService := service.NewAchievementService(db)
	authService := service.NewAuthService(cfg, db, userRepo, sessionRepo, mailerFallback)
	quizService := service.NewQuizService(db, questionRepo, attemptRepo, learningRepo, achievementService)
	dailyPlanService := service.NewDailyPlanService(db, quizService)

	authHandler := handlers.NewAuthHandler(authService, db, cfg)
	oauthHandler := handlers.NewOAuthHandler(cfg, authService)
	settingsHandler := handlers.NewSettingsHandler(db, settingsRepo, cfg, localStorage)
	curriculumHandler := handlers.NewCurriculumHandler(db)
	onboardingHandler := handlers.NewOnboardingHandler(db)
	quizHandler := handlers.NewQuizHandler(quizService, db)
	progressHandler := handlers.NewProgressHandler(db)
	mistakesHandler := handlers.NewMistakesHandler(db, questionRepo, learningRepo, achievementService)
	dailyPlanHandler := handlers.NewDailyPlanHandler(dailyPlanService, achievementService, db)
	achievementsHandler := handlers.NewAchievementsHandler(db)
	parentHandler := handlers.NewParentHandler(db)
	redirectHandler := handlers.NewRedirectHandler(db, cfg)
	uploadsHandler := handlers.NewUploadsHandler(db, localStorage)
	featureFlagsHandler := handlers.NewFeatureFlagsHandler(db)

	adminCurriculumHandler := handlers.NewAdminCurriculumHandler(db)
	adminGradesSubjectsHandler := handlers.NewAdminGradesSubjectsHandler(db)
	adminSubjectBooksHandler := handlers.NewAdminSubjectBooksHandler(db, localStorage, aiJobRepo)
	adminQuestionsHandler := handlers.NewAdminQuestionsHandler(db, cfg)
	adminUsersHandler := handlers.NewAdminUsersHandler(db)
	adminReportsHandler := handlers.NewAdminReportsHandler(db)

	requireAuth := middleware.RequireAuth(cfg.JWTAccessSecret)
	requireAdmin := middleware.RequireRole("admin", "super_admin")
	requireParent := middleware.RequireRole("parent")
	requireStudent := middleware.RequireRole("student")

	// صلاحيات لوحة الإدارة الدقيقة (docs/security-requirements.md §RBAC):
	// content_editor/content_reviewer/support كانوا يملكون أدوارًا في قاعدة
	// البيانات لكن لا يستطيعون فعليًا استخدام أي مسار إداري (requireAdmin كان
	// يقصر الكل على admin/super_admin). كل صلاحية أدناه محددة حسب دور فعلي،
	// مصدرها جداول roles/role_permissions/permissions (migration 0013) لا
	// خريطة ثابتة بالكود.
	permChecker := middleware.NewPermissionChecker(permissionRepo)
	permCurriculumRead := permChecker.RequirePermission("curriculum.read")
	permCurriculumWrite := permChecker.RequirePermission("curriculum.write")
	permQuestionsRead := permChecker.RequirePermission("questions.read")
	permQuestionsEdit := permChecker.RequirePermission("questions.edit")
	permQuestionsReview := permChecker.RequirePermission("questions.review")
	permQuestionsPublish := permChecker.RequirePermission("questions.publish")
	permUsersRead := permChecker.RequirePermission("users.read")
	permReportsRead := permChecker.RequirePermission("reports.read")
	permContentIssuesRead := permChecker.RequirePermission("content_issues.read")
	permContentIssuesResolve := permChecker.RequirePermission("content_issues.resolve")
	permAIContentGenerate := permChecker.RequirePermission("ai_content.generate")

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	// خدمة الملفات المرفوعة (صور الأسئلة) كملفات ثابتة — docs/database-design.md.
	// هذا مسار خاص بتنفيذ storage.Local تحديدًا؛ تنفيذ S3 مستقبلي (اختياري)
	// يعيد رابط الـbucket/CDN مباشرة عبر Storage.Save فلا يحتاج هذا المسار.
	app.Static("/assets", cfg.StorageDir)

	// الربط مع موقع الإيمان (docs/analytics-events.md) — لا يتطلب مصادقة.
	app.Get("/r", redirectHandler.FromAlemancenter)

	// أعلام الميزات العامة (docs/deployment-plan.md: إيقاف ميزة فورًا دون نشر جديد).
	app.Get("/feature-flags", featureFlagsHandler.PublicList)

	// هوية الموقع (اسم/شعار/عنوان/تواصل اجتماعي) — تستهلكها كل صفحات الواجهة الأمامية.
	app.Get("/settings", settingsHandler.Public)

	// تسجيل الدخول عبر Google/Facebook (جاهزية — تعمل فور ضبط بيانات الاعتماد في .env).
	app.Get("/auth/oauth/:provider", oauthHandler.Start)
	app.Get("/auth/oauth/:provider/callback", oauthHandler.Callback)

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
	auth.Post("/verify-email", authHandler.VerifyEmail)
	auth.Post("/resend-verification", requireAuth, authHandler.ResendVerification)

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
	// كل مسار محمي بدور محدد: طلب الربط وعرض الأبناء لدور parent فقط، والرد
	// على الطلب (موافقة/رفض) للطالب المستهدَف فقط — وإلا استطاع أي حساب
	// مصادَق عليه (بأي دور) انتحال دور ولي الأمر أو الرد نيابة عن طالب آخر.
	parent := app.Group("/parent", requireAuth)
	parent.Post("/link-requests", requireParent, parentHandler.RequestLink)
	parent.Get("/link-requests/incoming", requireStudent, parentHandler.IncomingRequests)
	parent.Post("/link-requests/:parentId/respond", requireStudent, parentHandler.RespondToRequest)
	parent.Get("/children", requireParent, parentHandler.Children)

	// --- الإدارة ---
	// المجموعة تتطلب مصادقة فقط؛ كل مسار يفرض صلاحيته الدقيقة بنفسه أدناه
	// (بعضها بصلاحية محتوى/تقارير مفتوحة لأدوار فرعية، وبعضها بـ requireAdmin
	// حصرًا لأنها حساسة: صلاحيات المستخدمين، أعلام الميزات، إعدادات الموقع).
	admin := app.Group("/admin", requireAuth)

	admin.Get("/curricula/grades", permCurriculumRead, adminGradesSubjectsHandler.ListGrades)
	admin.Post("/curricula/grades", permCurriculumWrite, adminGradesSubjectsHandler.CreateGrade)
	admin.Post("/curricula/subjects", permCurriculumWrite, adminGradesSubjectsHandler.CreateSubject)
	admin.Post("/subjects/:id/books", permCurriculumWrite, adminSubjectBooksHandler.UploadBook)
	admin.Get("/subjects/:id/books", permCurriculumRead, adminSubjectBooksHandler.ListBooks)

	admin.Get("/units", permCurriculumRead, adminCurriculumHandler.ListUnits)
	admin.Post("/units", permCurriculumWrite, adminCurriculumHandler.CreateUnit)
	admin.Put("/units/:id", permCurriculumWrite, adminCurriculumHandler.UpdateUnit)

	admin.Get("/lessons", permCurriculumRead, adminCurriculumHandler.ListLessons)
	admin.Post("/lessons", permCurriculumWrite, adminCurriculumHandler.CreateLesson)
	admin.Put("/lessons/:id", permCurriculumWrite, adminCurriculumHandler.UpdateLesson)

	admin.Get("/skills", permCurriculumRead, adminCurriculumHandler.ListSkills)
	admin.Post("/skills", permCurriculumWrite, adminCurriculumHandler.CreateSkill)
	admin.Put("/skills/:id", permCurriculumWrite, adminCurriculumHandler.UpdateSkill)

	admin.Get("/quizzes", permCurriculumRead, adminCurriculumHandler.ListQuizzes) // للقراءة فقط: تُنشأ تلقائيًا عند النشر

	admin.Get("/questions", permQuestionsRead, adminQuestionsHandler.List)
	admin.Post("/questions", permQuestionsEdit, adminQuestionsHandler.Create)
	admin.Post("/questions/ai-draft", permAIContentGenerate, adminQuestionsHandler.GenerateAIDraft)
	admin.Get("/questions/:id", permQuestionsRead, adminQuestionsHandler.Get)
	admin.Put("/questions/:id", permQuestionsEdit, adminQuestionsHandler.Update)
	admin.Delete("/questions/:id", permQuestionsEdit, adminQuestionsHandler.Delete)
	admin.Post("/questions/:id/submit-review", permQuestionsEdit, adminQuestionsHandler.SubmitForReview)
	admin.Post("/questions/:id/review", permQuestionsReview, adminQuestionsHandler.Review)
	admin.Post("/questions/:id/publish", permQuestionsPublish, adminQuestionsHandler.Publish)
	admin.Post("/questions/:id/archive", permQuestionsPublish, adminQuestionsHandler.Archive)
	admin.Post("/questions/:id/media", permQuestionsEdit, uploadsHandler.UploadQuestionMedia)
	admin.Get("/questions/:id/media", permQuestionsRead, uploadsHandler.ListQuestionMedia)

	// "المراجعات" ليست كيانًا منفصلاً — هي أسئلة بحالة in_review، تُدار بنفس مسارات /admin/questions
	admin.Get("/reviews", permQuestionsReview, func(c *fiber.Ctx) error {
		c.Request().URI().QueryArgs().Set("status", "in_review")
		return adminQuestionsHandler.List(c)
	})

	admin.Get("/users", permUsersRead, adminUsersHandler.List)
	admin.Put("/users/:id/role", requireAdmin, adminUsersHandler.ChangeRole) // تغيير الأدوار حصرًا لـ admin/super_admin

	admin.Get("/feature-flags", requireAdmin, featureFlagsHandler.AdminList)
	admin.Put("/feature-flags/:key", requireAdmin, featureFlagsHandler.AdminUpdate)

	admin.Get("/reports/overview", permReportsRead, adminReportsHandler.Overview)
	admin.Get("/reports/content-issues", permContentIssuesRead, adminReportsHandler.ListContentIssues)
	admin.Post("/reports/content-issues/:id/resolve", permContentIssuesResolve, adminReportsHandler.ResolveContentIssue)
	admin.Get("/reports/audit-logs", requireAdmin, adminReportsHandler.ListAuditLogs) // سجل تدقيق كامل حساس، admin فقط

	admin.Get("/settings", requireAdmin, settingsHandler.Admin)
	admin.Put("/settings", requireAdmin, settingsHandler.Update)
	admin.Post("/settings/logo", requireAdmin, settingsHandler.UploadLogo)
	admin.Post("/settings/favicon", requireAdmin, settingsHandler.UploadFavicon)
}
