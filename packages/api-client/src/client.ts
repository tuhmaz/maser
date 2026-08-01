import type {
  Achievement,
  AdminFeatureFlag,
  AIDraftInput,
  AIDraftResult,
  AdminGrade,
  AdminLesson,
  AdminQuiz,
  AdminSiteSettings,
  AdminSkill,
  AdminSubjectBook,
  AdminUnit,
  AdminUser,
  AnswerPayload,
  ApiErrorBody,
  AttemptResult,
  AttemptView,
  AuditLogEntry,
  BookType,
  AuthResponse,
  ChildProgress,
  ContentIssue,
  DailyPlan,
  FeatureFlagsMap,
  Grade,
  IncomingLinkRequest,
  Lesson,
  LessonQuizRef,
  MistakeItem,
  ProgressOverview,
  PublicSiteSettings,
  QuestionDetail,
  QuestionMedia,
  QuestionSummary,
  ReportsOverview,
  Role,
  SaveQuestionInput,
  StartTaskResult,
  Subject,
  SubjectProgress,
  SkillProgress,
  Unit,
  UpdateSiteSettingsInput,
  User,
} from "./types";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => string | null | undefined;
  /** يُستدعى بعد نجاح التجديد لتخزين رمز الوصول الجديد (في الذاكرة فقط). */
  onTokensUpdated?: (auth: AuthResponse) => void;
  /** يُستدعى عند فشل التجديد نهائيًا (مثلًا: توجيه المستخدم لصفحة الدخول). */
  onAuthFailure?: () => void;
}

/**
 * عميل بسيط لخدمة Alemedu API. يطابق المسارات الموثّقة في
 * contracts/openapi/openapi.yaml و docs/api-contract.md.
 *
 * القاعدة الذهبية (docs/security-requirements.md): هذا العميل لا يحسب أي نتيجة
 * أو صلاحية محليًا؛ كل قرار يُتخذ من استجابة الخادم فقط.
 *
 * الجلسة: رمز التحديث كوكي HttpOnly لا يراها هذا العميل إطلاقًا — كل طلب
 * يُرسَل بـ credentials:"include" فتُرفَق الكوكي تلقائيًا من المتصفح. عند رد
 * 401 على مسار محمي يحاول العميل تجديد رمز الوصول مرة واحدة عبر /auth/refresh
 * ثم يعيد الطلب؛ إن فشل التجديد يستدعي onAuthFailure.
 */
export class ApiClient {
  private baseUrl: string;
  private getAccessToken?: () => string | null | undefined;
  private onTokensUpdated?: (auth: AuthResponse) => void;
  private onAuthFailure?: () => void;
  private refreshInFlight: Promise<boolean> | null = null;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.getAccessToken = options.getAccessToken;
    this.onTokensUpdated = options.onTokensUpdated;
    this.onAuthFailure = options.onAuthFailure;
  }

  private async rawRequest(path: string, init?: RequestInit): Promise<Response> {
    const token = this.getAccessToken?.();
    const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers as Record<string, string> | undefined),
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${this.baseUrl}${path}`, { ...init, headers, credentials: "include" });
  }

  /** يجدّد الجلسة مرة واحدة مهما تزامنت الطلبات الفاشلة (single-flight). */
  private tryRefresh(): Promise<boolean> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = (async () => {
        try {
          const res = await fetch(`${this.baseUrl}/auth/refresh`, {
            method: "POST",
            credentials: "include", // يرفق كوكي رمز التحديث تلقائيًا
          });
          if (!res.ok) return false;
          const auth = (await res.json()) as AuthResponse;
          this.onTokensUpdated?.(auth);
          return true;
        } catch {
          return false;
        }
      })().finally(() => {
        this.refreshInFlight = null;
      });
    }
    return this.refreshInFlight;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    let res = await this.rawRequest(path, init);

    // 401 على مسار محمي (غير مسارات المصادقة نفسها) → جدّد وأعد المحاولة مرة واحدة
    if (res.status === 401 && !path.startsWith("/auth/")) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        res = await this.rawRequest(path, init);
      } else {
        this.onAuthFailure?.();
      }
    }

    if (res.status === 204) return undefined as T;

    const body = await res.json().catch(() => undefined);

    if (!res.ok) {
      const err = body as ApiErrorBody | undefined;
      throw new ApiError(
        res.status,
        err?.error?.code ?? "unknown_error",
        err?.error?.message ?? "حدث خطأ غير متوقع"
      );
    }

    return body as T;
  }

  // --- المصادقة ---
  register(input: { email: string; password: string; displayName: string }) {
    return this.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  login(input: { email: string; password: string }) {
    return this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  /** يستعيد الجلسة من كوكي رمز التحديث (مثلًا بعد إعادة تحميل الصفحة). */
  refresh() {
    return this.request<AuthResponse>("/auth/refresh", { method: "POST" });
  }

  logout() {
    return this.request<void>("/auth/logout", { method: "POST" });
  }

  me() {
    return this.request<User>("/auth/me");
  }

  /** يغيّر كلمة المرور ويعيد رمزي جلسة جديدين (الجلسات القديمة تُلغى في الخادم). */
  changePassword(input: { currentPassword: string; newPassword: string }) {
    return this.request<AuthResponse>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  // --- التهيئة ---
  completeOnboarding(input: { gradeId: string; subjectIds: string[] }) {
    return this.request<void>("/onboarding/complete", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  // --- المنهاج ---
  listGrades() {
    return this.request<Grade[]>("/grades");
  }

  listSubjectsForGrade(gradeId: string) {
    return this.request<Subject[]>(`/grades/${gradeId}/subjects`);
  }

  getSubject(subjectId: string) {
    return this.request<Subject>(`/subjects/${subjectId}`);
  }

  listUnits(subjectId: string) {
    return this.request<Unit[]>(`/subjects/${subjectId}/units`);
  }

  listLessons(unitId: string) {
    return this.request<Lesson[]>(`/units/${unitId}/lessons`);
  }

  getLesson(lessonId: string) {
    return this.request<Lesson>(`/lessons/${lessonId}`);
  }

  /** يعيد 404 كـ ApiError إن لم يوجد اختبار للدرس بعد — استعمل try/catch. */
  getLessonQuiz(lessonId: string) {
    return this.request<LessonQuizRef>(`/lessons/${lessonId}/quiz`);
  }

  // --- محرك الاختبارات ---

  startDiagnostic() {
    return this.request<AttemptView>("/diagnostic/start", { method: "POST" });
  }

  startQuiz(quizId: string) {
    return this.request<AttemptView>(`/quizzes/${quizId}/start`, { method: "POST" });
  }

  /** لاستئناف محاولة بعد انقطاع الاتصال — نفس شكل بدء المحاولة. */
  getAttempt(attemptId: string) {
    return this.request<AttemptView>(`/attempts/${attemptId}`);
  }

  saveAnswer(attemptId: string, input: { questionId: string; answer: AnswerPayload; timeSpentMs?: number }) {
    return this.request<{ saved: true }>(`/attempts/${attemptId}/answers`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  submitAttempt(attemptId: string) {
    return this.request<AttemptResult>(`/attempts/${attemptId}/submit`, { method: "POST" });
  }

  getAttemptResult(attemptId: string) {
    return this.request<AttemptResult>(`/attempts/${attemptId}/result`);
  }

  // --- التقدم ---

  progressOverview() {
    return this.request<ProgressOverview>("/progress");
  }

  progressSkills() {
    return this.request<SkillProgress[]>("/progress/skills");
  }

  progressSkill(skillId: string) {
    return this.request<SkillProgress & { incorrectCount: number }>(`/progress/skills/${skillId}`);
  }

  // --- دفتر الأخطاء ---

  listMistakes() {
    return this.request<MistakeItem[]>("/mistakes");
  }

  dueMistakes() {
    return this.request<MistakeItem[]>("/mistakes/due");
  }

  /** الخادم يصحّح الإجابة بنفسه (نفس آلية الاختبارات) ويعيد "correct" الفعلية. */
  reviewMistake(mistakeId: string, answer: AnswerPayload) {
    return this.request<{ newState: string; correct: boolean }>(`/mistakes/${mistakeId}/review`, {
      method: "POST",
      body: JSON.stringify({ answer }),
    });
  }

  // --- المهمة اليومية ---

  /** خطة اليوم إن وُجدت، أو { plan: null } إن لم تُولَّد بعد. */
  getTodayPlan() {
    return this.request<{ plan: DailyPlan | null }>("/daily-plan");
  }

  generateTodayPlan() {
    return this.request<DailyPlan>("/daily-plan/generate", { method: "POST" });
  }

  startDailyTask(taskId: string) {
    return this.request<StartTaskResult>(`/daily-tasks/${taskId}/start`, { method: "POST" });
  }

  completeDailyTask(taskId: string) {
    return this.request<{ completed: true }>(`/daily-tasks/${taskId}/complete`, { method: "POST" });
  }

  // --- لوحة الإدارة: الوحدات ---

  adminListUnits(subjectId?: string) {
    const qs = subjectId ? `?subjectId=${subjectId}` : "";
    return this.request<AdminUnit[]>(`/admin/units${qs}`);
  }
  adminCreateUnit(input: { subjectId: string; name: string; order?: number }) {
    return this.request<{ id: string }>("/admin/units", { method: "POST", body: JSON.stringify(input) });
  }
  adminUpdateUnit(id: string, input: Partial<{ name: string; order: number; isActive: boolean }>) {
    return this.request<{ updated: true }>(`/admin/units/${id}`, { method: "PUT", body: JSON.stringify(input) });
  }

  // --- لوحة الإدارة: الدروس ---

  adminListLessons(unitId?: string) {
    const qs = unitId ? `?unitId=${unitId}` : "";
    return this.request<AdminLesson[]>(`/admin/lessons${qs}`);
  }
  adminCreateLesson(input: { unitId: string; name: string; summary?: string; order?: number }) {
    return this.request<{ id: string }>("/admin/lessons", { method: "POST", body: JSON.stringify(input) });
  }
  adminUpdateLesson(id: string, input: Partial<{ name: string; summary: string; order: number; isActive: boolean }>) {
    return this.request<{ updated: true }>(`/admin/lessons/${id}`, { method: "PUT", body: JSON.stringify(input) });
  }

  // --- لوحة الإدارة: المهارات ---

  adminListSkills() {
    return this.request<AdminSkill[]>("/admin/skills");
  }
  adminCreateSkill(input: { name: string; description?: string; difficulty?: string; lessonId?: string }) {
    return this.request<{ id: string }>("/admin/skills", { method: "POST", body: JSON.stringify(input) });
  }
  adminUpdateSkill(id: string, input: Partial<{ name: string; description: string; difficulty: string; lessonId: string }>) {
    return this.request<{ updated: true }>(`/admin/skills/${id}`, { method: "PUT", body: JSON.stringify(input) });
  }

  adminListQuizzes() {
    return this.request<AdminQuiz[]>("/admin/quizzes");
  }

  // --- لوحة الإدارة: الأسئلة (docs/question-model.md) ---

  adminListQuestions(filters?: { status?: string; lessonId?: string; q?: string }) {
    const entries = Object.entries(filters ?? {}).filter(([, v]) => v);
    const params = new URLSearchParams(entries as [string, string][]).toString();
    return this.request<QuestionSummary[]>(`/admin/questions${params ? `?${params}` : ""}`);
  }
  adminGetQuestion(id: string) {
    return this.request<QuestionDetail>(`/admin/questions/${id}`);
  }
  adminCreateQuestion(input: SaveQuestionInput) {
    return this.request<{ id: string }>("/admin/questions", { method: "POST", body: JSON.stringify(input) });
  }
  adminGenerateAIQuestionDraft(input: AIDraftInput) {
    return this.request<AIDraftResult>("/admin/questions/ai-draft", { method: "POST", body: JSON.stringify(input) });
  }
  adminUpdateQuestion(id: string, input: SaveQuestionInput) {
    return this.request<{ updated: true; newVersionCreated: boolean }>(`/admin/questions/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  }
  adminDeleteQuestion(id: string) {
    return this.request<void>(`/admin/questions/${id}`, { method: "DELETE" });
  }
  adminSubmitForReview(id: string) {
    return this.request<{ status: string }>(`/admin/questions/${id}/submit-review`, { method: "POST" });
  }
  adminReviewQuestion(id: string, decision: "approved" | "changes_requested", comment?: string) {
    return this.request<{ status: string }>(`/admin/questions/${id}/review`, {
      method: "POST",
      body: JSON.stringify({ decision, comment }),
    });
  }
  adminPublishQuestion(id: string) {
    return this.request<{ status: string; quizId: string }>(`/admin/questions/${id}/publish`, { method: "POST" });
  }
  adminArchiveQuestion(id: string) {
    return this.request<{ status: string }>(`/admin/questions/${id}/archive`, { method: "POST" });
  }

  /** المراجعات = أسئلة بحالة in_review (لا كيان منفصل). */
  adminListReviews() {
    return this.request<QuestionSummary[]>("/admin/reviews");
  }

  // --- لوحة الإدارة: المستخدمون ---

  adminListUsers(role?: Role) {
    const qs = role ? `?role=${role}` : "";
    return this.request<AdminUser[]>(`/admin/users${qs}`);
  }
  adminChangeUserRole(userId: string, role: Role) {
    return this.request<{ role: string }>(`/admin/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
  }

  // --- لوحة الإدارة: التقارير وسجل التدقيق وبلاغات المحتوى ---

  adminReportsOverview() {
    return this.request<ReportsOverview>("/admin/reports/overview");
  }
  adminListContentIssues() {
    return this.request<ContentIssue[]>("/admin/reports/content-issues");
  }
  adminResolveContentIssue(id: string) {
    return this.request<{ status: string }>(`/admin/reports/content-issues/${id}/resolve`, { method: "POST" });
  }
  adminListAuditLogs() {
    return this.request<AuditLogEntry[]>("/admin/reports/audit-logs");
  }

  // --- الإنجازات ---

  listAchievements() {
    return this.request<Achievement[]>("/achievements");
  }

  // --- أعلام الميزات ---

  /** لا تتطلب مصادقة — تُستخدم لتفعيل/تعطيل ميزة في الواجهة فورًا. */
  getFeatureFlags() {
    return this.request<FeatureFlagsMap>("/feature-flags");
  }

  adminListFeatureFlags() {
    return this.request<AdminFeatureFlag[]>("/admin/feature-flags");
  }

  adminUpdateFeatureFlag(key: string, input: { isEnabled?: boolean; rolloutPercentage?: number }) {
    return this.request<{ updated: true }>(`/admin/feature-flags/${key}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  }

  // --- إدارة الصفوف/المواد (مرحلة التوسع) ---

  adminListGrades() {
    return this.request<AdminGrade[]>("/admin/curricula/grades");
  }
  adminCreateGrade(input: { name: string; level: number }) {
    return this.request<{ id: string }>("/admin/curricula/grades", { method: "POST", body: JSON.stringify(input) });
  }
  adminCreateSubject(input: { gradeId: string; name: string; slug: string }) {
    return this.request<{ id: string }>("/admin/curricula/subjects", { method: "POST", body: JSON.stringify(input) });
  }

  // --- كتب المادة وتحليل AI (docs/ai-curriculum-roadmap.md — E10) ---

  adminListSubjectBooks(subjectId: string) {
    return this.request<AdminSubjectBook[]>(`/admin/subjects/${subjectId}/books`);
  }
  adminUploadSubjectBook(subjectId: string, bookType: BookType, file: File) {
    const form = new FormData();
    form.append("bookType", bookType);
    form.append("file", file);
    return this.request<{ id: string; url: string }>(`/admin/subjects/${subjectId}/books`, { method: "POST", body: form });
  }

  // --- صور الأسئلة ---

  adminListQuestionMedia(questionId: string) {
    return this.request<QuestionMedia[]>(`/admin/questions/${questionId}/media`);
  }
  adminUploadQuestionMedia(questionId: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    return this.request<QuestionMedia>(`/admin/questions/${questionId}/media`, { method: "POST", body: form });
  }

  // --- التقدم التفصيلي لمادة ---

  progressSubject(subjectId: string) {
    return this.request<SubjectProgress>(`/progress/subjects/${subjectId}`);
  }

  // --- ولي الأمر ---

  parentRequestLink(studentEmail: string) {
    return this.request<{ requested: true }>("/parent/link-requests", {
      method: "POST",
      body: JSON.stringify({ studentEmail }),
    });
  }
  parentIncomingRequests() {
    return this.request<IncomingLinkRequest[]>("/parent/link-requests/incoming");
  }
  parentRespondToRequest(parentUserId: string, approve: boolean) {
    return this.request<{ status: string }>(`/parent/link-requests/${parentUserId}/respond`, {
      method: "POST",
      body: JSON.stringify({ approve }),
    });
  }
  parentChildren() {
    return this.request<ChildProgress[]>("/parent/children");
  }

  // --- تفعيل البريد ---

  verifyEmail(token: string) {
    return this.request<{ verified: true }>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }
  resendVerification() {
    return this.request<void>("/auth/resend-verification", { method: "POST" });
  }

  // --- هوية الموقع ---

  /** لا تتطلب مصادقة — الاسم/الشعار/روابط التواصل لكل صفحات الواجهة الأمامية. */
  getSiteSettings() {
    return this.request<PublicSiteSettings>("/settings");
  }

  adminGetSiteSettings() {
    return this.request<AdminSiteSettings>("/admin/settings");
  }
  adminUpdateSiteSettings(input: UpdateSiteSettingsInput) {
    return this.request<{ updated: true }>("/admin/settings", { method: "PUT", body: JSON.stringify(input) });
  }
  adminUploadLogo(file: File) {
    const form = new FormData();
    form.append("file", file);
    return this.request<{ url: string }>("/admin/settings/logo", { method: "POST", body: form });
  }
  adminUploadFavicon(file: File) {
    const form = new FormData();
    form.append("file", file);
    return this.request<{ url: string }>("/admin/settings/favicon", { method: "POST", body: form });
  }

  /** رابط بدء تسجيل الدخول عبر مزوّد خارجي — يُستخدم كـ href مباشر (تنقّل متصفح، لا fetch). */
  oauthStartUrl(provider: "google" | "facebook") {
    return `${this.baseUrl}/auth/oauth/${provider}`;
  }
}
