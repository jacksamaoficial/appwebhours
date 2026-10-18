import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { hasRole } from '../lib/permissions';
import type { Role } from '../types';

/** Renders children only for users with at least `role`; others go to the dashboard. */
export default function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!hasRole(user, role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
