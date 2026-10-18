import { Plus, Trash2 } from 'lucide-react';
import type { PayBand } from '../../types';

const newBand: PayBand = { start_time: '', end_time: '', hourly_rate: 0 };

interface Props {
  bands: PayBand[];
  overtimeRate: number | null;
  onBandsChange: (bands: PayBand[]) => void;
  onOvertimeRateChange: (rate: number | null) => void;
}

/** Schedule bands (from, to, €/h) plus the overtime rate. Controlled. */
export default function PayBandsFields({
  bands,
  overtimeRate,
  onBandsChange,
  onOvertimeRateChange,
}: Props) {
  const updateBand = (index: number, patch: Partial<PayBand>) =>
    onBandsChange(bands.map((b, i) => (i === index ? { ...b, ...patch } : b)));

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Lo fichado fuera de estos tramos cuenta como horas extra. Si la hora final es anterior a
        la inicial, el tramo termina al día siguiente.
      </p>

      <div className="space-y-2">
        {bands.length === 0 && (
          <p className="text-sm text-gray-400">Sin tramos: todo lo fichado cuenta como extra.</p>
        )}
        {bands.map((band, i) => (
          <div key={i} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
              <input
                type="time"
                required
                value={band.start_time}
                onChange={(e) => updateBand(i, { start_time: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
              <input
                type="time"
                required
                value={band.end_time}
                onChange={(e) => updateBand(i, { end_time: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">€ / hora</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={band.hourly_rate || ''}
                onChange={(e) => updateBand(i, { hourly_rate: parseFloat(e.target.value) || 0 })}
                className="w-28 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            {band.start_time && band.end_time && band.end_time <= band.start_time && (
              <span className="pb-2 text-xs text-gray-500">(+1 día)</span>
            )}
            <button
              type="button"
              onClick={() => onBandsChange(bands.filter((_, j) => j !== i))}
              className="mb-1 p-1.5 text-gray-400 hover:text-red-500"
              aria-label="Quitar tramo"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onBandsChange([...bands, { ...newBand }])}
          className="flex items-center gap-1 text-sm text-indigo-600 hover:underline"
        >
          <Plus className="h-4 w-4" /> Añadir tramo
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Hora extra (€ / hora)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={overtimeRate ?? ''}
          onChange={(e) => onOvertimeRateChange(e.target.value ? parseFloat(e.target.value) : null)}
          className="w-28 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>
    </div>
  );
}
