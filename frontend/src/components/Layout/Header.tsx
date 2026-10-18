import { useAuthStore } from '../../store/authStore';
import { useBusiness } from '../../hooks/useBusiness';
import { ROLE_LABELS } from '../../lib/permissions';

export default function Header() {
  const { user, logout } = useAuthStore();
  const { data: business } = useBusiness();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <span className="text-sm font-semibold text-gray-800">{business?.name}</span>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm text-gray-700">{user?.full_name}</p>
          {user && <p className="text-xs text-gray-400">{ROLE_LABELS[user.role]}</p>}
        </div>
        <button
          onClick={() => void logout()}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
