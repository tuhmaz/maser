export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-gray-600">
        نظرة عامة على حالة المحتوى والمستخدمين. راجع docs/user-journeys.md
        لصلاحيات كل دور (محرر المحتوى، المراجع، الناشر، الدعم، المدير).
      </p>
    </div>
  );
}
