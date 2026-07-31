import { RefreshCw } from "lucide-react";
import styles from "./Dashboard.module.css";

export function DashboardHeader({ firstName, loading, failedSources, actionError, onRefresh }: { firstName: string; loading: boolean; failedSources: string[]; actionError: string | null; onRefresh: () => void }) {
  return (
    <>
      <header className={styles.pageHeader}>
        <div><p className={styles.eyebrow}>مساحتك التعليمية</p><h1 className={styles.title}>مرحباً {firstName}</h1><p className={styles.copy}>كل جلسة قصيرة تنجزها تقرّبك من فهم أكثر ثباتاً.</p></div>
        <button type="button" className={styles.button} onClick={onRefresh} disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden="true" />تحديث البيانات</button>
      </header>
      {failedSources.length > 0 && <div role="alert" className={styles.alert}>تعذّر تحديث: {failedSources.join("، ")}. بقية المعلومات المعروضة وصلت من النظام بنجاح.</div>}
      {actionError && <div role="alert" className={`${styles.alert} ${styles.error}`}>{actionError}</div>}
    </>
  );
}

