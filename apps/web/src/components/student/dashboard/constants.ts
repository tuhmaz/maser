import {
  Lightbulb,
  ListChecks,
  NotebookPen,
  RefreshCw,
  Target,
  type LucideIcon,
} from "lucide-react";

export const TASK_META: Record<string, { title: string; icon: LucideIcon; tone: string }> = {
  short_review: { title: "مراجعة سريعة", icon: RefreshCw, tone: "blue" },
  explanation: { title: "فكرة اليوم", icon: Lightbulb, tone: "amber" },
  new_questions: { title: "تدريب موجه", icon: ListChecks, tone: "teal" },
  mistake_question: { title: "مراجعة فرصة تحسن", icon: NotebookPen, tone: "coral" },
  stabilization_test: { title: "اختبار تثبيت", icon: Target, tone: "violet" },
};

export const SUBJECT_TONES = ["blue", "green", "orange", "violet"] as const;

