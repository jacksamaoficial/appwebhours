export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface Job {
  job_id: string;
  user_id: string;
  name: string;
  base_salary: number;
  hours_per_week: number;
  hourly_rate: number;
  standard_start: string;
  standard_end: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkEntry {
  entry_id: string;
  user_id: string;
  job_id: string;
  date: string;
  start_time: string;
  end_time?: string;
  is_next_day: boolean;
  regular_hours: number;
  extra_hours: number;
  regular_earnings: number;
  extra_earnings: number;
  total_earnings: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  expense_id: string;
  user_id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  created_at: string;
}

export interface DashboardSummary {
  month: string;
  total_regular_earnings: number;
  total_extra_earnings: number;
  total_earnings: number;
  total_expenses: number;
  net_balance: number;
  savings_rate: number;
  health_message: string;
  work_entries_count: number;
  expenses_count: number;
}

export interface WeeklyData {
  week_start: string;
  week_end: string;
  week_label: string;
  income: number;
  expenses: number;
  balance: number;
}

export interface HistoryItem {
  type: 'work' | 'expense';
  id: string;
  date: string;
  title: string;
  subtitle: string;
  amount: number;
  is_income: boolean;
  created_at: string;
}
