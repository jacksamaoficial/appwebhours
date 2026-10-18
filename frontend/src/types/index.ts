// ─── Auth ────────────────────────────────────────────────────────────────────

// Hierarchical: each role includes the permissions of the previous one.
export type Role = 'hours' | 'hours_expenses' | 'hours_expenses_sales' | 'owner';

export interface User {
  id: string;
  business_id: string;
  role: Role;
  is_admin: boolean; // server admin: backup / restore panel
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  business_name: string;
}

// ─── Business ────────────────────────────────────────────────────────────────

export interface Business {
  id: string;
  name: string;
  currency: string;
  created_at: string;
}

export interface EmployeeCreate {
  email: string;
  full_name: string;
  password: string;
  role: Exclude<Role, 'owner'>;
  pay_schedule?: PayScheduleUpdate; // optional: schedule and rates in the same step
}

export interface EmployeeUpdate {
  full_name?: string;
  role?: Exclude<Role, 'owner'>;
  is_active?: boolean;
  password?: string;
}

// ─── Business days (daily sales + closed days) ───────────────────────────────

export interface BusinessDay {
  id: string | null;
  date: string;
  cash: number;
  card: number;
  cash_out: number;
  /** cash + card - cash_out */
  total: number;
  notes: string | null;
  is_closed: boolean;
  closed_at: string | null;
  closed_by_id: string | null;
}

export interface DailySalesUpdate {
  cash: number;
  card: number;
  cash_out: number;
  notes?: string | null;
}

export interface DayStatus {
  date: string;
  is_closed: boolean;
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export interface Job {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  hourly_rate: number | null;
  currency: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobCreate {
  name: string;
  description?: string | null;
  hourly_rate?: number | null;
  currency?: string;
  color?: string;
}

export interface JobUpdate {
  name?: string;
  description?: string | null;
  hourly_rate?: number | null;
  currency?: string;
  color?: string;
  is_active?: boolean;
}

// ─── Time Entries ─────────────────────────────────────────────────────────────

export interface TimeEntry {
  id: string;
  business_id: string;
  user_id: string;
  job_id: string;
  date: string;          // YYYY-MM-DD
  start_time: string;    // HH:MM:SS
  end_time: string | null; // earlier than start_time = ends after midnight
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeEntryCreate {
  user_id?: string; // owner only: record hours for an employee
  job_id: string;
  date: string;
  start_time: string;
  end_time?: string | null;
  notes?: string | null;
}

export interface TimeEntryUpdate {
  job_id?: string;
  date?: string;
  start_time?: string;
  end_time?: string | null;
  notes?: string | null;
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'drinks'
  | 'ice'
  | 'food'
  | 'supplies'
  | 'cleaning'
  | 'staff'
  | 'rent'
  | 'utilities'
  | 'maintenance'
  | 'equipment'
  | 'entertainment'
  | 'marketing'
  | 'fees'
  | 'other';

export interface Expense {
  id: string;
  business_id: string;
  user_id: string;
  job_id: string | null;
  date: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCreate {
  job_id?: string | null;
  date: string;
  amount: number;
  currency?: string;
  category?: ExpenseCategory;
  description: string;
}

export interface ExpenseUpdate {
  job_id?: string | null;
  date?: string;
  amount?: number;
  currency?: string;
  category?: ExpenseCategory;
  description?: string;
}

// ─── API errors ──────────────────────────────────────────────────────────────

export interface ApiError {
  detail: string;
}

// ─── Payroll (pay schedule + overtime) ───────────────────────────────────────

export interface PayBand {
  id?: string;
  start_time: string; // HH:MM[:SS]
  end_time: string; // at or before start_time = crosses midnight
  hourly_rate: number;
}

export interface PaySchedule {
  user_id: string;
  bands: PayBand[];
  overtime_rate: number | null;
}

export interface PayScheduleUpdate {
  bands: PayBand[];
  overtime_rate: number | null;
}

export interface BandWork {
  start_time: string;
  end_time: string;
  hourly_rate: number;
  minutes: number;
  amount: number;
}

export interface PayrollEntry {
  entry_id: string;
  date: string;
  start_time: string;
  end_time: string;
  regular_minutes: number;
  overtime_minutes: number;
  regular_pay: number;
  overtime_pay: number;
  total_pay: number;
}

export interface EmployeePayroll {
  user_id: string;
  full_name: string;
  has_schedule: boolean;
  overtime_rate: number | null;
  regular_minutes: number;
  overtime_minutes: number;
  regular_pay: number;
  overtime_pay: number;
  total_pay: number;
  open_entries: number;
  bands: BandWork[];
  entries: PayrollEntry[];
}

// ─── Admin: backups ──────────────────────────────────────────────────────────

export type BackupKind = 'auto' | 'manual' | 'pre-restore' | 'upload';

export interface Backup {
  name: string;
  kind: BackupKind;
  created_at: string;
  size_bytes: number;
}

export interface RestoreResult {
  restored: string;
  safety_backup: Backup;
}
