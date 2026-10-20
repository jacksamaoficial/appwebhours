import { useMemo, useState } from 'react';
import { eachDayOfInterval, endOfMonth, format, min, parse, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Lock, LockOpen, Pencil } from 'lucide-react';
import { useBusinessDays, useCloseDay, useSetDailySales } from '../../hooks/useBusinessDays';
import { useAuthStore } from '../../store/authStore';
import { hasRole } from '../../lib/permissions';
import { apiErrorMessage } from '../../lib/errors';
import { euros } from '../../lib/format';
import type { BusinessDay, DailySalesUpdate } from '../../types';

const emptySales: DailySalesUpdate = { cash: 0, card: 0, cash_out: 0, notes: '' };

function emptyDay(date: string): BusinessDay {
  return {
    id: null,
    date,
    cash: 0,
    card: 0,
    cash_out: 0,
    total: 0,
    notes: null,
    is_closed: false,
    closed_at: null,
    closed_by_id: null,
  };
}

export default function SalesPage() {
  const user = useAuthStore((s) => s.user);
  const isOwner = hasRole(user, 'owner');

  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<DailySalesUpdate>({ ...emptySales });
  const [error, setError] = useState('');

  const monthDate = parse(month, 'yyyy-MM', new Date());
  const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');

  const { data: stored = [], isLoading } = useBusinessDays({ from_date: monthStart, to_date: monthEnd });
  const setSales = useSetDailySales();
  const closeDay = useCloseDay();

  // Every day of the month up to today, newest first, filled with stored data.
  const days = useMemo(() => {
    const first = startOfMonth(parse(month, 'yyyy-MM', new Date()));
    const last = min([endOfMonth(first), new Date()]);
    if (last < first) return [];
    const byDate = new Map(stored.map((d) => [d.date, d]));
    return eachDayOfInterval({ start: first, end: last })
      .map((d) => format(d, 'yyyy-MM-dd'))
      .reverse()
      .map((date) => byDate.get(date) ?? emptyDay(date));
  }, [stored, month]);

  const totals = stored.reduce(
    (acc, d) => ({
      cash: acc.cash + d.cash,
      card: acc.card + d.card,
      cash_out: acc.cash_out + d.cash_out,
      total: acc.total + d.total,
    }),
    { cash: 0, card: 0, cash_out: 0, total: 0 },
  );

  const startEditing = (day: BusinessDay) => {
    setError('');
    setEditing(day.date);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
    setForm({ cash: day.cash, card: day.card, cash_out: day.cash_out, notes: day.notes ?? '' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setError('');
    try {
      await setSales.mutateAsync({ date: editing, data: { ...form, notes: form.notes || null } });
      setEditing(null);
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudieron guardar las ventas.'));
    }
  };

  const toggleClosed = async (day: BusinessDay) => {
    const close = !day.is_closed;
    const label = format(parse(day.date, 'yyyy-MM-dd', new Date()), "d 'de' MMMM", { locale: es });
    const question = close
      ? `¿Cerrar el ${label}? Nadie podrá modificar horas, gastos ni ventas de ese día.`
      : `¿Reabrir el ${label}? Se podrán volver a modificar sus datos.`;
    if (!window.confirm(question)) return;
    setError('');
    try {
      await closeDay.mutateAsync({ date: day.date, close });
      if (close && editing === day.date) setEditing(null);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const formTotal = (form.cash || 0) + (form.card || 0) - (form.cash_out || 0);

  const stats = [
    { label: 'Efectivo', value: totals.cash, color: 'text-emerald-600' },
    { label: 'Tarjetas', value: totals.card, color: 'text-indigo-600' },
    { label: 'Salidas de caja', value: totals.cash_out, color: 'text-orange-600' },
    { label: 'Total neto', value: totals.total, color: 'text-gray-900' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ventas y cierres</h1>
          <p className="text-sm text-gray-500 mt-1">Total neto = efectivo + tarjetas − salidas de caja</p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className={`text-2xl font-bold ${color}`}>{euros(value)}</p>
            <p className="mt-1 text-sm text-gray-500">{label} del mes</p>
          </div>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {editing && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Ventas del{' '}
            {format(parse(editing, 'yyyy-MM-dd', new Date()), "EEEE d 'de' MMMM", { locale: es })}
          </h2>
          <form onSubmit={(e) => void handleSave(e)} className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
            {(
              [
                ['cash', 'Efectivo'],
                ['card', 'Tarjetas'],
                ['cash_out', 'Salidas de caja'],
              ] as const
            ).map(([field, label]) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form[field] || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [field]: e.target.value ? parseFloat(e.target.value) : 0 }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            ))}
            <div>
              <p className="block text-sm font-medium text-gray-700 mb-1">Total neto</p>
              <p className="py-2 text-lg font-semibold text-gray-900">{euros(formTotal)}</p>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <input
                type="text"
                placeholder="Opcional (p. ej. motivo de una salida de caja)"
                value={form.notes ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2 flex gap-3 lg:col-span-4">
              <button
                type="submit"
                disabled={setSales.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {setSales.isPending ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Phones: one card per day */}
      <ul className="space-y-3 md:hidden">
        {days.map((day) => (
          <li key={day.date} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">
                  {format(parse(day.date, 'yyyy-MM-dd', new Date()), "EEEE d", { locale: es })}
                </p>
                {day.is_closed ? (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    <Lock className="h-3 w-3" /> Cerrado
                  </span>
                ) : (
                  <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                    Abierto
                  </span>
                )}
              </div>
              <p className="text-lg font-bold tabular-nums text-gray-900">{euros(day.total)}</p>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div><dt className="text-gray-500">Efectivo</dt><dd className="tabular-nums text-gray-800">{euros(day.cash)}</dd></div>
              <div><dt className="text-gray-500">Tarjetas</dt><dd className="tabular-nums text-gray-800">{euros(day.card)}</dd></div>
              <div><dt className="text-gray-500">Salidas</dt><dd className="tabular-nums text-gray-800">{euros(day.cash_out)}</dd></div>
            </dl>
            {day.notes && <p className="mt-2 text-xs text-gray-400">{day.notes}</p>}
            <div className="mt-3 flex gap-2">
              {!day.is_closed && (
                <button
                  onClick={() => startEditing(day)}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"
                >
                  <Pencil className="h-4 w-4" /> Editar
                </button>
              )}
              {isOwner && (
                <button
                  onClick={() => void toggleClosed(day)}
                  disabled={closeDay.isPending}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
                >
                  {day.is_closed ? <><LockOpen className="h-4 w-4" /> Reabrir</> : <><Lock className="h-4 w-4" /> Cerrar día</>}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className={`overflow-x-auto rounded-xl border border-gray-200 bg-white ${days.length ? 'hidden md:block' : ''}`}>
        {isLoading ? (
          <div className="flex items-center justify-center p-10">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : days.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">Sin días en este mes todavía.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Día</th>
                <th className="px-5 py-3 text-right font-medium">Efectivo</th>
                <th className="px-5 py-3 text-right font-medium">Tarjetas</th>
                <th className="px-5 py-3 text-right font-medium">Salidas</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {days.map((day) => (
                <tr key={day.date} className={editing === day.date ? 'bg-indigo-50/50' : undefined}>
                  <td className="px-5 py-3 text-gray-900 whitespace-nowrap">
                    {format(parse(day.date, 'yyyy-MM-dd', new Date()), 'EEE d', { locale: es })}
                    {day.notes && <p className="text-xs text-gray-400">{day.notes}</p>}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-gray-700">{euros(day.cash)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-gray-700">{euros(day.card)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-gray-700">{euros(day.cash_out)}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-semibold text-gray-900">
                    {euros(day.total)}
                  </td>
                  <td className="px-5 py-3">
                    {day.is_closed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        <Lock className="h-3 w-3" /> Cerrado
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                        Abierto
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      {!day.is_closed && (
                        <button
                          onClick={() => startEditing(day)}
                          className="flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </button>
                      )}
                      {isOwner && (
                        <button
                          onClick={() => void toggleClosed(day)}
                          disabled={closeDay.isPending}
                          className="flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {day.is_closed ? (
                            <>
                              <LockOpen className="h-3.5 w-3.5" /> Reabrir
                            </>
                          ) : (
                            <>
                              <Lock className="h-3.5 w-3.5" /> Cerrar día
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
