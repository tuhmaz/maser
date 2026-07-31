"use client";

import dynamic from "next/dynamic";
import { DashboardHeader } from "@/components/student/dashboard/DashboardHeader";
import { DailyPlanCard } from "@/components/student/dashboard/DailyPlanCard";
import { RecommendationCard } from "@/components/student/dashboard/RecommendationCard";
import { DashboardMetrics } from "@/components/student/dashboard/DashboardMetrics";
import { useStudentDashboard } from "@/components/student/dashboard/useStudentDashboard";
import styles from "@/components/student/dashboard/Dashboard.module.css";

const LearningOverview = dynamic(() => import("@/components/student/dashboard/LearningOverview"), {
  loading: () => <div className={styles.skeleton} />,
});
const DashboardPanels = dynamic(() => import("@/components/student/dashboard/DashboardPanels"), {
  loading: () => <div className={styles.skeleton} />,
});

export default function DashboardPage() {
  const { view, refresh, generatePlan, startTask } = useStudentDashboard();
  const { data } = view;
  const pendingTask = data.plan?.tasks.find((task) => task.status !== "completed");

  return (
    <div className={styles.dashboard}>
      <DashboardHeader firstName={view.firstName} loading={view.loading} failedSources={view.failedSources} actionError={view.actionError} onRefresh={() => void refresh()} />
      <section className={styles.heroGrid}>
        <DailyPlanCard plan={data.plan} loading={view.loading} completedTasks={view.completedTasks} totalTasks={view.totalTasks} progress={view.planProgress} generating={view.generating} busyTaskId={view.busyTaskId} onGenerate={() => void generatePlan()} onStart={(task) => void startTask(task)} />
        <RecommendationCard dueMistakes={view.dueMistakes} pendingTask={pendingTask} busy={view.busyTaskId === pendingTask?.id} onStart={(task) => void startTask(task)} />
      </section>
      <DashboardMetrics skillCompletion={view.skillCompletion} mastered={data.overview?.skills.mastered ?? 0} totalSkills={data.overview?.skills.total ?? 0} completedTasks={view.completedTasks} totalTasks={view.totalTasks} currentStreak={data.overview?.streak.current ?? 0} longestStreak={data.overview?.streak.longest ?? 0} dueCount={view.dueMistakes.length} mistakeCount={data.mistakes.length} />
      <LearningOverview subjects={data.subjects} loading={view.loading} skillCompletion={view.skillCompletion} questionsAnswered={data.overview?.questionsAnswered ?? 0} mastered={data.overview?.skills.mastered ?? 0} needsReview={data.overview?.skills.needsReview ?? 0} lastQuizScore={data.overview?.lastQuizScore ?? null} />
      <DashboardPanels mistakes={data.mistakes} achievement={view.earnedAchievements[0]} pendingTask={pendingTask} mistakesDueNow={data.overview?.mistakesDueNow ?? view.dueMistakes.length} onStart={(task) => void startTask(task)} />
    </div>
  );
}

