import { useState } from 'react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Lock, Plus, Trash2 } from 'lucide-react';
import { useExpenses, useCreateExpense, useDeleteExpense } from '../../hooks/useExpenses';
import { useJobs } from '../../hooks/useJobs';
import { useClosedDays } from '../../hooks/useBusinessDays';
import { apiErrorMessage } from '../../lib/errors';
import { euros } from '../../lib/format';
import type { ExpenseCategory, ExpenseCreate } from '../../types';

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'drinks', label: 'Bebidas y licores' },
  { value: 'ice', label: 'Hielo' },
  { value: 'food', label: 'Comida y snacks' },
  { value: 'supplies', label: 'Consumibles (vasos, pajitas, servilletas)' },
  { value: 'cleaning', label: 'Limpieza' },
  { value: 'staff', label: 'Personal y extras' },
  { value: 'rent', label: 'Alquiler' },
  { value: 'utilities', label: 'Suministros (luz, agua, gas, internet)' },
  { value: 'maintenance', label: 'Reparaciones y mantenimiento' },
  { value: 'equipment', label: 'Equipamiento y mobiliario' },
  { value: 'entertainment', label: 'Música, DJ y eventos' },
  { value: 'marketing', label: 'Publicidad y promoción' },
  { value: 'fees', label: 'Impuestos, tasas y licencias' },
  { value: 'other', label: 'Otros' },
];

const today = format(new Date(), 'yyyy-MM-dd');
const emptyForm: ExpenseCreate = {
  job_id: null,
  date: today,
  amount: 0,
  currency: 'EUR',
  category: 'other',
  description: '',
};

export default function ExpensesPage() {
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ExpenseCreate>({ ...emptyForm });
  const [error, setError] = useState('');

  const { data: expenses = [], isLoading } = useExpenses({ from_date: monthStart, to_date: monthEnd });
  const { data: jobs = [] } = useJobs();
  const { closed } = useClosedDays({ from_date: monthStart, to_date: monthEnd });
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createExpense.mutateAsync({
        ...form,
        job_id: form.job_id || null,
      });
      setForm({ ...emptyForm });
      setShowForm(false);
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo guardar el gasto.'));
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    try {
      await deleteExpense.mutateAsync(id);
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo eliminar el gasto.'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gastos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Total del mes:{' '}
            <span className="font-semibold text-orange-600">{euros(total)}</span>
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo gasto
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Registrar gasto</h2>
          <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Importe *</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={form.amount || ''}
                onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Puesto (opcional)</label>
              <select
                value={form.job_id ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, job_id: e.target.value || null }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Sin puesto</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
              <input
                type="text"
                required
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2 flex gap-3 lg:col-span-3">
              <button
                type="submit"
                disabled={createExpense.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {createExpense.isPending ? 'Guardando...' : 'Guardar'}
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

      {/* List */}
      <div className="rounded-xl border border-gray-200 bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center p-10">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">Sin gastos este mes.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {expenses.map((expense) => {
              const job = jobs.find((j) => j.id === expense.job_id);
              const category = CATEGORIES.find((c) => c.value === expense.category);
              return (
                <li key={expense.id} className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{expense.description}</p>
                    <p className="text-xs text-gray-500">
                      {format(parseISO(expense.date), 'd MMM', { locale: es })} ·{' '}
                      {category?.label ?? expense.category}
                      {job && ` · ${job.name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="whitespace-nowrap text-sm font-semibold text-gray-900">
                      {euros(expense.amount)}
                    </span>
                    {closed.has(expense.date) ? (
                      <Lock className="h-4 w-4 text-gray-300" aria-label="Día cerrado" />
                    ) : (
                      <button
                        onClick={() => void handleDelete(expense.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="Eliminar gasto"
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
