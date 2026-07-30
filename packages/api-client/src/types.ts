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
