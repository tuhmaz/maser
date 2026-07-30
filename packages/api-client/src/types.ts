// أنواع مطابقة لمخططات contracts/openapi/openapi.yaml
// (نسخة يدوية مؤقتة؛ يمكن استبدالها لاحقًا بتوليد آلي من العقد عبر openapi-typescript)

export type Role =
  | "student"
  | "parent"
  | "content_editor"
  | "content_reviewer"
  | "support"
  | "admin"
  | "super_admin";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  onboardingCompleted: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Grade {
  id: string;
  name: string;
  level: number;
}

export interface Subject {
  id: string;
  name: string;
  slug: string;
}

export interface Unit {
  id: string;
  name: string;
  order: number;
}

export interface Lesson {
  id: string;
  name: string;
  summary?: string;
  order: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

// --- لوحة الإدارة (docs/user-journeys.md، docs/question-model.md) ---

export interface AdminUnit {
  id: string;
  subjectId: string;
  name: string;
  order: number;
  isActive: boolean;
}

export interface AdminLesson {
  id: string;
  unitId: string;
  name: string;
  summary?: string;
  order: number;
  isActive: boolean;
}

export interface AdminSkill {
  id: string;
  name: string;
  description?: string;
  difficulty: "easy" | "medium" | "hard";
  lessonIds: string[];
}

export interface AdminQuiz {
  id: string;
  lessonId: string;
  lessonName: string;
  title: string;
  questionCount: number;
}

export type QuestionStatus = "draft" | "in_review" | "changes_requested" | "approved" | "published" | "archived";

export interface QuestionSummary {
  id: string;
  lessonId: string;
  lessonName: string;
  type: QuestionType;
  difficulty: "easy" | "medium" | "hard";
  status: QuestionStatus;
  body: string;
  usageCount: number;
  errorRate: number | null;
  openReports: number;
}

export interface AdminQuestionOption {
  id?: string;
  text: string;
  order: number;
  isCorrect: boolean;
  wrongReason?: string;
}

export interface QuestionDetail {
  id: string;
  gradeId: string;
  subjectId: string;
  unitId: string;
  lessonId: string;
  type: QuestionType;
  difficulty: "easy" | "medium" | "hard";
  expectedTimeSec: number;
  status: QuestionStatus;
  versionNumber: number;
  body: string;
  explanation?: string;
  options?: AdminQuestionOption[];
  numericAnswer?: string;
  tolerance?: number;
  skillIds: string[];
}

export interface SaveQuestionInput {
  gradeId?: string;
  subjectId?: string;
  unitId?: string;
  lessonId?: string;
  type: QuestionType;
  difficulty?: "easy" | "medium" | "hard";
  expectedTimeSec?: number;
  body: string;
  explanation?: string;
  options?: AdminQuestionOption[];
  numericAnswer?: string;
  tolerance?: number;
  skillIds: string[];
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  isActive: boolean;
  gradeName?: string;
  currentStreak?: number;
  createdAt: string;
}

export interface ReportsOverview {
  totalStudents: number;
  questionsByStatus: Record<string, number>;
  openContentReports: number;
  highErrorQuestions: number;
  staleIncompleteAttempts: number;
  averageScore: number | null;
}

export interface ContentIssue {
  id: string;
  questionId: string;
  questionBody: string;
  reason: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  createdAt: string;
}

// --- الإنجازات ---

export interface Achievement {
  key: string;
  title: string;
  description?: string;
  earned: boolean;
  earnedAt?: string;
}

// --- أعلام الميزات ---

export type FeatureFlagsMap = Record<string, boolean>;

export interface AdminFeatureFlag {
  key: string;
  isEnabled: boolean;
  rolloutPercentage: number;
  description?: string;
}

// --- ولي الأمر ---

export interface IncomingLinkRequest {
  parentUserId: string;
  parentName: string;
  parentEmail: string;
}

export interface ChildProgress {
  studentUserId: string;
  displayName: string;
  gradeName?: string;
  currentStreak: number;
  lastQuizScore?: number;
  masteredSkills: number;
}

// --- إدارة الصفوف/المواد ---

export interface AdminGrade {
  id: string;
  name: string;
  level: number;
  isActive: boolean;
}

// --- خريطة تقدم مادة تفصيلية ---

export interface SubjectProgressSkill {
  skillId: string;
  name: string;
  state: SkillState;
  reason: string;
}
export interface SubjectProgressLesson {
  lessonId: string;
  name: string;
  skills: SubjectProgressSkill[];
}
export interface SubjectProgressUnit {
  unitId: string;
  name: string;
  lessons: SubjectProgressLesson[];
}
export interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  completionPercent: number;
  totalSkills: number;
  masteredSkills: number;
  units: SubjectProgressUnit[];
}

// --- صور الأسئلة ---

export interface QuestionMedia {
  id: string;
  url: string;
}

// --- المنهاج (تكملة) ---

export interface LessonQuizRef {
  id: string;
  type: "diagnostic" | "lesson" | "unit" | "review" | "daily";
  title: string;
}

// --- محرك الاختبارات (services/api/internal/models/quiz.go) ---

export interface SanitizedOption {
  id: string;
  text: string;
  order: number;
}

export type QuestionType =
  | "single_choice"
  | "true_false"
  | "numeric_input"
  | "multi_select"
  | "ordering"
  | "matching";

export interface SanitizedQuestion {
  id: string;
  type: QuestionType;
  body: string;
  options?: SanitizedOption[];
  answered: boolean;
}

export interface Attempt {
  id: string;
  quizId?: string;
  type: "diagnostic" | "lesson" | "unit" | "review" | "daily";
  status: "in_progress" | "submitted";
  questionOrder: string[];
  startedAt: string;
  submittedAt?: string;
}

export interface AttemptView {
  attempt: Attempt;
  questions: SanitizedQuestion[];
}

/**
 * شكل الإجابة المرسلة يعتمد على نوع السؤال (docs/question-model.md):
 * single_choice/true_false → { optionId } | multi_select → { optionIds } |
 * numeric_input → { value } | ordering → { orderedOptionIds }
 */
export type AnswerPayload =
  | { optionId: string }
  | { optionIds: string[] }
  | { value: number }
  | { orderedOptionIds: string[] };

export interface SkillResult {
  skillId: string;
  skillName: string;
  correct: number;
  total: number;
  newState: SkillState;
  reason: string;
}

export interface AttemptResult {
  attemptId: string;
  score: number;
  correctCount: number;
  totalCount: number;
  skillBreakdown: SkillResult[];
}

// --- التقدم وإتقان المهارات (docs/mastery-model.md) ---

export type SkillState =
  | "not_started"
  | "introduced"
  | "practicing"
  | "developing"
  | "mastered"
  | "needs_review";

export interface ProgressOverview {
  skills: { total: number; mastered: number; needsReview: number };
  questionsAnswered: number;
  streak: { current: number; longest: number };
  lastQuizScore: number | null;
  mistakesDueNow: number;
}

export interface SkillProgress {
  skillId: string;
  name: string;
  state: SkillState;
  reason: string;
  questionsSeen: number;
  correctCount: number;
}

// --- المهمة اليومية (docs/daily-plan-rules.md) ---

export type DailyTaskType = "short_review" | "explanation" | "new_questions" | "mistake_question" | "stabilization_test";
export type DailyTaskStatus = "pending" | "in_progress" | "completed";

export interface ExplanationPayload {
  skillId: string;
  skillName: string;
  reason: string;
}
export interface ReviewPayload {
  mistakeIds: string[];
}
export interface QuestionsPayload {
  questionIds: string[];
}

export interface DailyTask {
  id: string;
  type: DailyTaskType;
  order: number;
  status: DailyTaskStatus;
  payload: ExplanationPayload | ReviewPayload | QuestionsPayload;
}

export interface DailyPlan {
  id: string;
  date: string;
  type: "short" | "regular" | "review" | "catch_up";
  estimatedMinutes: number;
  tasks: DailyTask[];
}

export interface StartTaskResult {
  kind: "attempt" | "review" | "explanation";
  attempt?: AttemptView;
}

// --- دفتر الأخطاء ---

export interface MistakeItem {
  id: string;
  questionId: string;
  questionBody: string;
  skillName: string;
  mistakeCount: number;
  state: string;
  nextReviewAt?: string;
}
