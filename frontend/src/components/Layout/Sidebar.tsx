import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  Receipt,
  Briefcase,
  Wallet,
  Users,
  Banknote,
  DatabaseBackup,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { hasRole } from '../../lib/permissions';
import type { Role } from '../../types';

const links: { to: string; label: string; Icon: typeof Clock; minRole: Role; adminOnly?: boolean }[] = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard, minRole: 'hours' },
  { to: '/tracker', label: 'Fichajes', Icon: Clock, minRole: 'hours' },
  { to: '/expenses', label: 'Gastos', Icon: Receipt, minRole: 'hours_expenses' },
  { to: '/sales', label: 'Ventas y cierres', Icon: Wallet, minRole: 'hours_expenses_sales' },
  { to: '/jobs', label: 'Puestos', Icon: Briefcase, minRole: 'owner' },
  { to: '/employees', label: 'Empleados', Icon: Users, minRole: 'owner' },
  { to: '/payroll', label: 'Nóminas', Icon: Banknote, minRole: 'owner' },
  {
    to: '/admin/backups',
    label: 'Copias de seguridad',
    Icon: DatabaseBackup,
    minRole: 'hours',
    adminOnly: true,
  },
];

interface Props {
  /** Mobile only: the menu is a drawer, open or closed. Always visible from md up. */
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: Props) {
  const user = useAuthStore((s) => s.user);

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200',
          'md:static md:z-auto md:w-60 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
          <div className="leading-tight">
            <span className="block text-base font-semibold text-gray-900">Jack Social Club</span>
            <span className="block text-xs font-medium uppercase tracking-widest text-gray-500">
              Gestión
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 md:hidden" aria-label="Cerrar menú">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {links
            .filter(({ minRole, adminOnly }) => hasRole(user, minRole) && (!adminOnly || user?.is_admin))
            .map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  ].join(' ')
                }
              >
                <Icon className="h-5 w-5" />
                {label}
              </NavLink>
            ))}
        </nav>
      </aside>
    </>
  );
}
