import type { Role, User } from '../types';

const ROLE_RANK: Record<Role, number> = {
  hours: 0,
  hours_expenses: 1,
  hours_expenses_sales: 2,
  owner: 3,
};

export const ROLE_LABELS: Record<Role, string> = {
  hours: 'Solo horas',
  hours_expenses: 'Horas y gastos',
  hours_expenses_sales: 'Horas, gastos y ventas',
  owner: 'Dueño',
};

export const EMPLOYEE_ROLES = ['hours', 'hours_expenses', 'hours_expenses_sales'] as const;

export function hasRole(user: User | null, minimum: Role): boolean {
  return user != null && ROLE_RANK[user.role] >= ROLE_RANK[minimum];
}
