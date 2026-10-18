import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/** Server admin pages (backups): only users listed in ADMIN_EMAILS on the server. */
export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user?.is_admin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
