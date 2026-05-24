// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
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
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export interface Job {
  id: string;
  user_id: string;
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
  user_id: string;
  job_id: string;
  date: string;          // YYYY-MM-DD
  start_time: string;    // HH:MM:SS
  end_time: string | null;
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeEntryCreate {
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
  | 'transport'
  | 'food'
  | 'equipment'
  | 'software'
  | 'office'
  | 'other';

export interface Expense {
  id: string;
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
