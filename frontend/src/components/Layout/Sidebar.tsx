import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Clock, Receipt, Briefcase } from 'lucide-react';

const links = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/tracker', label: 'Time Tracker', Icon: Clock },
  { to: '/expenses', label: 'Gastos', Icon: Receipt },
  { to: '/jobs', label: 'Trabajos', Icon: Briefcase },
];

export default function Sidebar() {
  return (
    <aside className="flex w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center px-6 border-b border-gray-200">
        <span className="text-lg font-semibold text-indigo-600">HorasApp</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {links.map(({ to, label, Icon }) => (
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
