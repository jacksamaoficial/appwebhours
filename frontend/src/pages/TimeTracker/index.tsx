import { useState } from 'react';
import { format } from 'date-fns';
import { Lock, Plus, Trash2 } from 'lucide-react';
import { useTimeEntries, useCreateTimeEntry, useDeleteTimeEntry } from '../../hooks/useTimeEntries';
import { useJobs } from '../../hooks/useJobs';
import { useEmployees } from '../../hooks/useBusiness';
import { useClosedDays } from '../../hooks/useBusinessDays';
import { useAuthStore } from '../../store/authStore';
import { hasRole } from '../../lib/permissions';
import { apiErrorMessage } from '../../lib/errors';
import type { TimeEntry, TimeEntryCreate } from '../../types';

const today = format(new Date(), 'yyyy-MM-dd');

const emptyForm: TimeEntryCreate = {
  job_id: '',
  date: today,
  start_time: '',
  end_time: '',
  notes: '',
};

function formatMinutes(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/** "22:00 → 03:00 (+1)" when the shift ends after midnight. */
function formatRange(entry: Pick<TimeEntry, 'start_time' | 'end_time'>): string {
  const start = entry.start_time.slice(0, 5);
  if (!entry.end_time) return `${start} (en curso)`;
  const end = entry.end_time.slice(0, 5);
  return `${start} → ${end}${end <= start ? ' (+1)' : ''}`;
}

export default function TimeTrackerPage() {
  const user = useAuthStore((s) => s.user);
  const isOwner = hasRole(user, 'owner');

  const [selectedDate, setSelectedDate] = useState(today);
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [form, setForm] = useState<TimeEntryCreate>({ ...emptyForm, date: today });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const { data: entries = [], isLoading } = useTimeEntries({
    date: selectedDate,
    user_id: employeeFilter || undefined,
  });
  const { data: jobs = [] } = useJobs();
  const { data: employees = [] } = useEmployees(isOwner);
  const { closed } = useClosedDays({ from_date: selectedDate, to_date: selectedDate });
  const isClosed = closed.has(selectedDate);
  const createEntry = useCreateTimeEntry();
  const deleteEntry = useDeleteTimeEntry();

  const totalMinutes = entries.reduce((s, e) => s + (e.duration_minutes ?? 0), 0);
  const endsNextDay = !!form.end_time && !!form.start_time && form.end_time <= form.start_time;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createEntry.mutateAsync({
        ...form,
        user_id: form.user_id || undefined,
        end_time: form.end_time || undefined,
        notes: form.notes || undefined,
      });
      setForm({ ...emptyForm, date: selectedDate });
      setShowForm(false);
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo guardar la entrada.'));
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    try {
      await deleteEntry.mutateAsync(id);
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo eliminar la entrada.'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fichajes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Total del día:{' '}
            <span className="font-semibold text-indigo-600">{formatMinutes(totalMinutes)}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isOwner && (
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Todo el personal</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name}
                </option>
              ))}
            </select>
          )}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setForm((f) => ({ ...f, date: e.target.value }));
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={() => setShowForm(true)}
            disabled={isClosed}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nueva entrada
          </button>
        </div>
      </div>

      {isClosed && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <Lock className="h-4 w-4" />
          Este día está cerrado. No se pueden añadir, editar ni borrar horas.
        </div>
      )}

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Form */}
      {showForm && !isClosed && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Registrar horas</h2>
          <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-3">
            {isOwner && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empleado</label>
                <select
                  value={form.user_id ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value || undefined }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Yo</option>
                  {employees
                    .filter((emp) => emp.id !== user?.id && emp.is_active)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Puesto *</label>
              <select
                required
                value={form.job_id}
                onChange={(e) => setForm((f) => ({ ...f, job_id: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Selecciona un puesto</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entrada *</label>
              <input
                type="time"
                required
                value={form.start_time}
                onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salida</label>
              <input
                type="time"
                value={form.end_time ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
              {endsNextDay && (
                <p className="mt-1 text-xs text-gray-500">Termina al día siguiente (después de medianoche).</p>
              )}
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <input
                type="text"
                placeholder="Descripción opcional"
                value={form.notes ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2 flex gap-3 lg:col-span-3">
              <button
                type="submit"
                disabled={createEntry.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {createEntry.isPending ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Entries list */}
      <div className="rounded-xl border border-gray-200 bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center p-10">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">
            Sin entradas para este día.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {entries.map((entry) => {
              const job = jobs.find((j) => j.id === entry.job_id);
              const employee = isOwner ? employees.find((emp) => emp.id === entry.user_id) : null;
              return (
                <li key={entry.id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: job?.color ?? '#6366f1' }}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {employee ? `${employee.full_name} · ` : ''}
                        {job?.name ?? 'Puesto'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatRange(entry)}
                        {entry.notes && ` · ${entry.notes}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700">
                      {entry.duration_minutes != null ? formatMinutes(entry.duration_minutes) : '—'}
                    </span>
                    {!isClosed && (
                      <button
                        onClick={() => void handleDelete(entry.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="Eliminar entrada"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
