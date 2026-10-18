import { AlertTriangle } from 'lucide-react';
import { usePaySchedule } from '../../hooks/usePayroll';
import { euros, timeRange } from '../../lib/format';

/** One-line view of an employee's pay bands and overtime rate. */
export default function ScheduleSummary({ userId }: { userId: string }) {
  const { data: schedule } = usePaySchedule(userId);
  if (!schedule) return null;

  if (schedule.bands.length === 0) {
    return (
      <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
        <AlertTriangle className="h-3.5 w-3.5" />
        Sin horario: todo lo fichado cuenta como extra.
      </p>
    );
  }

  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {schedule.bands.map((b) => (
        <span key={b.id} className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
          {timeRange(b.start_time, b.end_time)} · {euros(b.hourly_rate)}/h
        </span>
      ))}
      <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-700">
        Extra ·{' '}
        {schedule.overtime_rate != null ? `${euros(schedule.overtime_rate)}/h` : 'sin tarifa'}
      </span>
    </div>
  );
}
