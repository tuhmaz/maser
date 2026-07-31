"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DailyTask, User } from "@alemedu/api-client";
import { api } from "@/lib/api";
import type { DashboardData, DashboardViewModel } from "./types";

const MVP_GRADE_ID = "00000000-0000-0000-0000-000000000004";

const EMPTY_DATA: DashboardData = {
  user: null,
  plan: null,
  overview: null,
  subjects: [],
  mistakes: [],
  achievements: [],
};

export function useStudentDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const base = await Promise.allSettled([
      api.me(),
      api.getTodayPlan(),
      api.progressOverview(),
      api.listMistakes(),
      api.listAchievements(),
    ]);

    const user = valueOr(base[0], null);
    const gradeId = ((user as (User & { gradeId?: string }) | null)?.gradeId || MVP_GRADE_ID);
    const subjectsResult = await Promise.allSettled([api.listSubjectsForGrade(gradeId)]);
    const subjects = valueOr(subjectsResult[0], []);
    const progressResults = await Promise.allSettled(subjects.map((subject) => api.progressSubject(subject.id)));

    const labels = ["الحساب", "خطة اليوم", "التقدم", "دفتر الأخطاء", "الإنجازات"];
    const failed = base.flatMap((request, index) => request.status === "rejected" ? [labels[index]] : []);
    if (subjectsResult[0].status === "rejected") failed.push("المواد");
    if (progressResults.some((request) => request.status === "rejected")) failed.push("تقدم المواد");

    setFailedSources(failed);
    setData({
      user,
      plan: valueOr(base[1], { plan: null }).plan,
      overview: valueOr(base[2], null),
      mistakes: valueOr(base[3], []),
      achievements: valueOr(base[4], []),
      subjects: subjects.map((subject, index) => ({ subject, progress: valueOr(progressResults[index], null) })),
    });
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const completedTasks = data.plan?.tasks.filter((task) => task.status === "completed").length ?? 0;
  const totalTasks = data.plan?.tasks.length ?? 0;
  const dueMistakes = useMemo(() => data.mistakes.filter((item) => item.nextReviewAt && new Date(item.nextReviewAt).getTime() <= Date.now()), [data.mistakes]);
  const earnedAchievements = useMemo(() => data.achievements.filter((item) => item.earned).sort((a, b) => new Date(b.earnedAt || 0).getTime() - new Date(a.earnedAt || 0).getTime()), [data.achievements]);

  const view: DashboardViewModel = {
    data,
    loading,
    failedSources,
    actionError,
    busyTaskId,
    generating,
    firstName: data.user?.displayName?.trim().split(/\s+/)[0] || "بك",
    completedTasks,
    totalTasks,
    planProgress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    skillCompletion: data.overview?.skills.total ? Math.round((data.overview.skills.mastered / data.overview.skills.total) * 100) : 0,
    dueMistakes,
    earnedAchievements,
  };

  async function generatePlan() {
    setGenerating(true);
    setActionError(null);
    try {
      const plan = await api.generateTodayPlan();
      setData((current) => ({ ...current, plan }));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "تعذّر إعداد خطة اليوم.");
    } finally {
      setGenerating(false);
    }
  }

  async function startTask(task: DailyTask) {
    setBusyTaskId(task.id);
    setActionError(null);
    try {
      const result = await api.startDailyTask(task.id);
      if (result.kind === "attempt" && result.attempt) return router.push(`/quizzes/${result.attempt.attempt.id}`);
      if (result.kind === "review") return router.push("/review");
      router.push("/today");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "تعذّر بدء المهمة.");
    } finally {
      setBusyTaskId(null);
    }
  }

  return { view, refresh, generatePlan, startTask };
}

function valueOr<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

