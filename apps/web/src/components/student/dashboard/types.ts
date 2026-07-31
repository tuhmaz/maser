import type {
  Achievement,
  DailyPlan,
  MistakeItem,
  ProgressOverview,
  Subject,
  SubjectProgress,
  User,
} from "@alemedu/api-client";

export type SubjectRow = {
  subject: Subject;
  progress: SubjectProgress | null;
};

export type DashboardData = {
  user: User | null;
  plan: DailyPlan | null;
  overview: ProgressOverview | null;
  subjects: SubjectRow[];
  mistakes: MistakeItem[];
  achievements: Achievement[];
};

export type DashboardViewModel = {
  data: DashboardData;
  loading: boolean;
  failedSources: string[];
  actionError: string | null;
  busyTaskId: string | null;
  generating: boolean;
  firstName: string;
  completedTasks: number;
  totalTasks: number;
  planProgress: number;
  skillCompletion: number;
  dueMistakes: MistakeItem[];
  earnedAchievements: Achievement[];
};

