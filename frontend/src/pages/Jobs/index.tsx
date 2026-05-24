import { useState } from 'react';
import { Plus, Archive } from 'lucide-react';
import { useJobs, useCreateJob, useArchiveJob } from '../../hooks/useJobs';
import type { Job, JobCreate } from '../../types';

const emptyForm: JobCreate = {
  name: '',
  description: '',
  hourly_rate: undefined,
  currency: 'EUR',
  color: '#6366f1',
};

export default function JobsPage() {
  const { data: jobs = [], isLoading } = useJobs(false);
  const createJob = useCreateJob();
  const archiveJob = useArchiveJob();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<JobCreate>({ ...emptyForm });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createJob.mutateAsync({
      ...form,
      description: form.description || undefined,
      hourly_rate: form.hourly_rate || undefined,
    });
    setForm({ ...emptyForm });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Trabajos</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo trabajo
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Nuevo trabajo</h2>
          <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tarifa/h</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.hourly_rate ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    hourly_rate: e.target.value ? parseFloat(e.target.value) : undefined,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="h-10 w-full rounded-lg border border-gray-300 px-1 py-1 cursor-pointer"
              />
            </div>
            <div className="col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input
                type="text"
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="col-span-2 flex gap-3 lg:col-span-3">
              <button
                type="submit"
                disabled={createJob.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {createJob.isPending ? 'Guardando...' : 'Guardar'}
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

      <div className="rounded-xl border border-gray-200 bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center p-10">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">
            No tienes trabajos. Crea el primero.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {jobs.map((job: Job) => (
              <li key={job.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span
                    className="h-4 w-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: job.color }}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      {job.name}
                      {!job.is_active && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          Archivado
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {job.hourly_rate != null
                        ? `${job.hourly_rate} ${job.currency}/h`
                        : 'Sin tarifa'}
                      {job.description && ` · ${job.description}`}
                    </p>
                  </div>
                </div>
                {job.is_active && (
                  <button
                    onClick={() => void archiveJob.mutateAsync(job.id)}
                    className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                    aria-label="Archivar trabajo"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Archivar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
