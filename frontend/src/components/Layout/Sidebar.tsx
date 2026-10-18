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

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);

  return (
    <aside className="flex w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center px-6 border-b border-gray-200">
        <span className="text-lg font-semibold text-indigo-600">HorasApp</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {links
          .filter(({ minRole, adminOnly }) => hasRole(user, minRole) && (!adminOnly || user?.is_admin))
          .map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
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
  );
}
