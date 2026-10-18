import { useState } from 'react';
import { endOfMonth, format, parse, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { usePayroll } from '../../hooks/usePayroll';
import { euros, formatMinutes, timeRange } from '../../lib/format';
import type { EmployeePayroll } from '../../types';

function EmployeeCard({ row }: { row: EmployeePayroll }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div>
          <p className="text-base font-semibold text-gray-900">{row.full_name}</p>
          {!row.has_schedule && (
            <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              Sin horario configurado: todo cuenta como hora extra.
            </p>
          )}
          {row.has_schedule && row.overtime_rate == null && row.overtime_minutes > 0 && (
            <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              Sin tarifa de hora extra: las extras se cuentan pero no se pagan.
            </p>
          )}
          {row.open_entries > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              {row.open_entries} fichaje(s) sin hora de salida, no incluidos.
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-6 text-right">
          <div>
            <p className="text-xs text-gray-500">Horas normales</p>
            <p className="text-sm font-semibold text-gray-900">{formatMinutes(row.regular_minutes)}</p>
            <p className="text-xs text-gray-500">{euros(row.regular_pay)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Horas extra</p>
            <p className="text-sm font-semibold text-orange-600">{formatMinutes(row.overtime_minutes)}</p>
            <p className="text-xs text-gray-500">{euros(row.overtime_pay)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total a pagar</p>
            <p className="text-lg font-bold text-gray-900">{euros(row.total_pay)}</p>
          </div>
        </div>
      </div>

      {row.bands.length > 0 && (
        <div className="flex flex-wrap gap-2 px-5 pb-4">
          {row.bands.map((b) => (
            <span
              key={b.start_time}
              className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-700"
            >
              {timeRange(b.start_time, b.end_time)} · {euros(b.hourly_rate)}/h ·{' '}
              {formatMinutes(b.minutes)} = {euros(b.amount)}
            </span>
          ))}
          {row.overtime_rate != null && (
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs text-orange-700">
              Extra · {euros(row.overtime_rate)}/h · {formatMinutes(row.overtime_minutes)} ={' '}
              {euros(row.overtime_pay)}
            </span>
          )}
        </div>
      )}

      {row.entries.length > 0 && (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex w-full items-center gap-1 border-t border-gray-100 px-5 py-2 text-xs text-gray-500 hover:bg-gray-50"
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Detalle por día ({row.entries.length})
          </button>
          {open && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-2 font-medium">Día</th>
                    <th className="px-5 py-2 font-medium">Turno</th>
                    <th className="px-5 py-2 text-right font-medium">Normales</th>
                    <th className="px-5 py-2 text-right font-medium">Extra</th>
                    <th className="px-5 py-2 text-right font-medium">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {row.entries.map((e) => (
                    <tr key={e.entry_id}>
                      <td className="px-5 py-2 whitespace-nowrap text-gray-900">
                        {format(parse(e.date, 'yyyy-MM-dd', new Date()), 'EEE d MMM', { locale: es })}
                      </td>
                      <td className="px-5 py-2 whitespace-nowrap text-gray-600">
                        {timeRange(e.start_time, e.end_time)}
                      </td>
                      <td className="px-5 py-2 text-right tabular-nums text-gray-700">
                        {formatMinutes(e.regular_minutes)}
                      </td>
                      <td
                        className={`px-5 py-2 text-right tabular-nums ${e.overtime_minutes ? 'font-semibold text-orange-600' : 'text-gray-400'}`}
                      >
                        {e.overtime_minutes ? formatMinutes(e.overtime_minutes) : '—'}
                      </td>
                      <td className="px-5 py-2 text-right tabular-nums text-gray-900">
                        {euros(e.total_pay)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function PayrollPage() {
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const monthDate = parse(month, 'yyyy-MM', new Date());
  const { data: rows = [], isLoading } = usePayroll({
    from_date: format(startOfMonth(monthDate), 'yyyy-MM-dd'),
    to_date: format(endOfMonth(monthDate), 'yyyy-MM-dd'),
  });

  const totals = rows.reduce(
    (acc, r) => ({
      overtime: acc.overtime + r.overtime_minutes,
      pay: acc.pay + r.total_pay,
    }),
    { overtime: 0, pay: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nóminas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Horas extra del mes:{' '}
            <span className="font-semibold text-orange-600">{formatMinutes(totals.overtime)}</span>
            {' · '}Total a pagar: <span className="font-semibold text-gray-900">{euros(totals.pay)}</span>
          </p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-10">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
          Sin fichajes este mes.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <EmployeeCard key={row.user_id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
