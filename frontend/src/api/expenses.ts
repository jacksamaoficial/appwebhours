import { apiClient } from './client';
import type { Expense, ExpenseCreate, ExpenseUpdate } from '../types';

interface ListParams {
  from_date?: string;
  to_date?: string;
  job_id?: string;
}

export async function getExpenses(params: ListParams = {}): Promise<Expense[]> {
  const res = await apiClient.get<Expense[]>('/expenses', { params });
  return res.data;
}

export async function getExpense(id: string): Promise<Expense> {
  const res = await apiClient.get<Expense>(`/expenses/${id}`);
  return res.data;
}

export async function createExpense(data: ExpenseCreate): Promise<Expense> {
  const res = await apiClient.post<Expense>('/expenses', data);
  return res.data;
}

export async function updateExpense(id: string, data: ExpenseUpdate): Promise<Expense> {
  const res = await apiClient.patch<Expense>(`/expenses/${id}`, data);
  return res.data;
}

export async function deleteExpense(id: string): Promise<void> {
  await apiClient.delete(`/expenses/${id}`);
}
