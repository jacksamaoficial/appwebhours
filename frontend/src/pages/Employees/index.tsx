import { useState } from 'react';
import { CalendarClock, KeyRound, Plus } from 'lucide-react';
import { useCreateEmployee, useEmployees, useUpdateEmployee } from '../../hooks/useBusiness';
import { EMPLOYEE_ROLES, ROLE_LABELS } from '../../lib/permissions';
import { apiErrorMessage } from '../../lib/errors';
import type { EmployeeCreate, EmployeeUpdate, PayBand, User } from '../../types';
import PayBandsFields from './PayBandsFields';
import PayScheduleEditor from './PayScheduleEditor';
import ScheduleSummary from './ScheduleSummary';

const emptyForm: EmployeeCreate = { email: '', full_name: '', password: '', role: 'hours' };

const ROLE_HINTS: Record<EmployeeCreate['role'], string> = {
  hours: 'Ficha sus horas.',
  hours_expenses: 'Ficha sus horas y apunta gastos del pub.',
  hours_expenses_sales: 'Además registra las ventas del día.',
};

export default function EmployeesPage() {
  const { data: employees = [], isLoading } = useEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EmployeeCreate>({ ...emptyForm });
  const [bands, setBands] = useState<PayBand[]>([]);
  const [overtimeRate, setOvertimeRate] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [scheduleFor, setScheduleFor] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const hasSchedule = bands.length > 0 || overtimeRate != null;
      await createEmployee.mutateAsync({
        ...form,
        pay_schedule: hasSchedule ? { bands, overtime_rate: overtimeRate } : undefined,
      });
      setForm({ ...emptyForm });
      setBands([]);
      setOvertimeRate(null);
      setShowForm(false);
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo crear el empleado.'));
    }
  };

  const update = async (employee: User, data: EmployeeUpdate) => {
    setError('');
    try {
      await updateEmployee.mutateAsync({ id: employee.id, data });
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo actualizar el empleado.'));
    }
  };

  const resetPassword = (employee: User) => {
    const password = window.prompt(
      `Nueva contraseña para ${employee.full_name} (mín. 8 caracteres, con letras y números):`,
    );
    if (password) void update(employee, { password });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
          <p className="text-sm text-gray-500 mt-1">
            Crea las cuentas de tu equipo y elige qué puede hacer cada uno.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo empleado
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Nuevo empleado</h2>
          <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                required
                autoComplete="off"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña inicial * <span className="text-gray-400 font-normal">(mín. 8, con números)</span>
              </label>
              <input
                type="text"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Perfil *</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as EmployeeCreate['role'] }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                {EMPLOYEE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">{ROLE_HINTS[form.role]}</p>
            </div>
            <div className="col-span-2 rounded-lg bg-gray-50 p-4">
              <p className="mb-2 text-sm font-medium text-gray-900">Horario y tarifas</p>
              <PayBandsFields
                bands={bands}
                overtimeRate={overtimeRate}
                onBandsChange={setBands}
                onOvertimeRateChange={setOvertimeRate}
              />
            </div>
            <div className="col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={createEmployee.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {createEmployee.isPending ? 'Creando...' : 'Crear cuenta'}
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
        ) : (
          <ul className="divide-y divide-gray-100">
            {employees.map((employee) => {
              const isOwner = employee.role === 'owner';
              return (
                <li key={employee.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        {employee.full_name}
                        {!employee.is_active && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                            Desactivado
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{employee.email}</p>
                      {!isOwner && <ScheduleSummary userId={employee.id} />}
                    </div>
                    {isOwner ? (
                      <span className="text-xs font-medium text-indigo-600">{ROLE_LABELS.owner}</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setScheduleFor(scheduleFor === employee.id ? null : employee.id)}
                          className="flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          <CalendarClock className="h-3.5 w-3.5" />
                          Horario y tarifas
                        </button>
                        <select
                          value={employee.role}
                          disabled={!employee.is_active}
                          onChange={(e) =>
                            void update(employee, { role: e.target.value as EmployeeCreate['role'] })
                          }
                          className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                          aria-label="Perfil"
                        >
                          {EMPLOYEE_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => resetPassword(employee)}
                          className="rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50"
                          aria-label="Cambiar contraseña"
                          title="Cambiar contraseña"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => void update(employee, { is_active: !employee.is_active })}
                          className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          {employee.is_active ? 'Desactivar' : 'Reactivar'}
                        </button>
                      </div>
                    )}
                  </div>
                  {scheduleFor === employee.id && (
                    <PayScheduleEditor employee={employee} onClose={() => setScheduleFor(null)} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
