import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, Receipt, Briefcase, TrendingUp } from 'lucide-react';
import { useTimeEntries } from '../../hooks/useTimeEntries';
import { useExpenses } from '../../hooks/useExpenses';
import { useJobs } from '../../hooks/useJobs';

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export default function DashboardPage() {
  const today = new Date();
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');

  const { data: todayEntries = [] } = useTimeEntries({ date: format(today, 'yyyy-MM-dd') });
  const { data: weekEntries = [] } = useTimeEntries({ from_date: weekStart, to_date: weekEnd });
  const { data: monthExpenses = [] } = useExpenses({ from_date: monthStart, to_date: monthEnd });
  const { data: jobs = [] } = useJobs();

  const todayMinutes = todayEntries.reduce((s, e) => s + (e.duration_minutes ?? 0), 0);
  const weekMinutes = weekEntries.reduce((s, e) => s + (e.duration_minutes ?? 0), 0);
  const monthExpenseTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);

  const stats = [
    {
      label: 'Hoy',
      value: formatMinutes(todayMinutes),
      icon: Clock,
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      label: 'Esta semana',
      value: formatMinutes(weekMinutes),
      icon: TrendingUp,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Gastos del mes',
      value: `${monthExpenseTotal.toFixed(2)} €`,
      icon: Receipt,
      color: 'text-orange-600 bg-orange-50',
    },
    {
      label: 'Trabajos activos',
      value: String(jobs.length),
      icon: Briefcase,
      color: 'text-violet-600 bg-violet-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {format(today, "EEEE, d 'de' MMMM yyyy", { locale: es })}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className={`inline-flex rounded-lg p-2 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
            <p className="mt-1 text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Today's entries */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Entradas de hoy</h2>
        {todayEntries.length === 0 ? (
          <p className="text-sm text-gray-400">Sin registros hoy.</p>
        ) : (
          <ul className="space-y-2">
            {todayEntries.map((entry) => {
              const job = jobs.find((j) => j.id === entry.job_id);
              return (
                <li key={entry.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {job && (
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: job.color }}
                      />
                    )}
                    <span className="font-medium text-gray-800">{job?.name ?? entry.job_id}</span>
                    <span className="text-gray-400">
                      {entry.start_time.slice(0, 5)}
                      {entry.end_time ? ` → ${entry.end_time.slice(0, 5)}` : ' (en curso)'}
                    </span>
                  </div>
                  <span className="text-gray-600">
                    {entry.duration_minutes != null
                      ? formatMinutes(entry.duration_minutes)
                      : '—'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
