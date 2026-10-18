import { useEffect, useState } from 'react';
import { usePaySchedule, useSetPaySchedule } from '../../hooks/usePayroll';
import { apiErrorMessage } from '../../lib/errors';
import { hhmm } from '../../lib/format';
import type { PayBand, User } from '../../types';
import PayBandsFields from './PayBandsFields';

/** Edit the pay bands + overtime rate of an existing employee. */
export default function PayScheduleEditor({ employee, onClose }: { employee: User; onClose: () => void }) {
  const { data: schedule, isLoading } = usePaySchedule(employee.id);
  const saveSchedule = useSetPaySchedule();

  const [bands, setBands] = useState<PayBand[]>([]);
  const [overtimeRate, setOvertimeRate] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!schedule) return;
    setBands(
      schedule.bands.map((b) => ({
        start_time: hhmm(b.start_time),
        end_time: hhmm(b.end_time),
        hourly_rate: b.hourly_rate,
      })),
    );
    setOvertimeRate(schedule.overtime_rate);
  }, [schedule]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await saveSchedule.mutateAsync({
        userId: employee.id,
        data: { bands, overtime_rate: overtimeRate },
      });
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo guardar el horario.'));
    }
  };

  if (isLoading) {
    return <div className="px-5 pb-4 text-sm text-gray-400">Cargando horario…</div>;
  }

  return (
    <form onSubmit={(e) => void handleSave(e)} className="mx-5 mb-4 space-y-4 rounded-lg bg-gray-50 p-4">
      <p className="text-sm font-medium text-gray-900">Horario y tarifas de {employee.full_name}</p>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <PayBandsFields
        bands={bands}
        overtimeRate={overtimeRate}
        onBandsChange={setBands}
        onOvertimeRateChange={setOvertimeRate}
      />

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saveSchedule.isPending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saveSchedule.isPending ? 'Guardando...' : 'Guardar horario'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-white"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
