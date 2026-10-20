import { LogOut, Menu } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useBusiness } from '../../hooks/useBusiness';
import { ROLE_LABELS } from '../../lib/permissions';

export default function Header({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuthStore();
  const { data: business } = useBusiness();

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={onMenu}
          className="-ml-1 rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="truncate text-sm font-semibold text-gray-800">{business?.name}</span>
      </div>
      <div className="flex shrink-0 items-center gap-3 md:gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-sm text-gray-700">{user?.full_name}</p>
          {user && <p className="text-xs text-gray-400">{ROLE_LABELS[user.role]}</p>}
        </div>
        <button
          onClick={() => void logout()}
          className="flex items-center gap-2 rounded-lg border border-gray-300 p-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors sm:px-3 sm:py-1.5"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut className="h-4 w-4 sm:hidden" />
          <span className="hidden sm:inline">Cerrar sesión</span>
        </button>
      </div>
    </header>
  );
}
