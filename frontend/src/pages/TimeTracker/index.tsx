import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';
import { useTimeEntries, useCreateTimeEntry, useDeleteTimeEntry } from '../../hooks/useTimeEntries';
import { useJobs } from '../../hooks/useJobs';
import type { TimeEntryCreate } from '../../types';

const today = format(new Date(), 'yyyy-MM-dd');

const emptyForm: TimeEntryCreate = {
  job_id: '',
  date: today,
  start_time: '',
  end_time: '',
  notes: '',
};

export default function TimeTrackerPage() {
  const [selectedDate, setSelectedDate] = useState(today);
  const [form, setForm] = useState<TimeEntryCreate>({ ...emptyForm, date: today });
  const [showForm, setShowForm] = useState(false);

  const { data: entries = [], isLoading } = useTimeEntries({ date: selectedDate });
  const { data: jobs = [] } = useJobs();
  const createEntry = useCreateTimeEntry();
  const deleteEntry = useDeleteTimeEntry();

  const totalMinutes = entries.reduce((s, e) => s + (e.duration_minutes ?? 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createEntry.mutateAsync({
      ...form,
      end_time: form.end_time || undefined,
      notes: form.notes || undefined,
    });
    setForm({ ...emptyForm, date: selectedDate });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Time Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">
            Total del día:{' '}
            <span className="font-semibold text-indigo-600">
              {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
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
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nueva entrada
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Registrar horas</h2>
          <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trabajo *</label>
              <select
                required
                value={form.job_id}
                onChange={(e) => setForm((f) => ({ ...f, job_id: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Selecciona un trabajo</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inicio *</label>
              <input
                type="time"
                required
                value={form.start_time}
                onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
              <input
                type="time"
                value={form.end_time ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <input
                type="text"
                placeholder="Descripción opcional"
                value={form.notes ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="col-span-2 flex gap-3 lg:col-span-3">
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
              return (
                <li key={entry.id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: job?.color ?? '#6366f1' }}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{job?.name ?? 'Trabajo'}</p>
                      <p className="text-xs text-gray-500">
                        {entry.start_time.slice(0, 5)}
                        {entry.end_time ? ` → ${entry.end_time.slice(0, 5)}` : ' (en curso)'}
                        {entry.notes && ` · ${entry.notes}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700">
                      {entry.duration_minutes != null
                        ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m`
                        : '—'}
                    </span>
                    <button
                      onClick={() => void deleteEntry.mutateAsync(entry.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Eliminar entrada"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
