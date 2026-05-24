import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createExpense, deleteExpense, getExpenses, updateExpense } from '../api/expenses';
import type { ExpenseCreate, ExpenseUpdate } from '../types';

interface UseExpensesParams {
  from_date?: string;
  to_date?: string;
  job_id?: string;
}

export function useExpenses(params: UseExpensesParams = {}) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: () => getExpenses(params),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ExpenseCreate) => createExpense(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExpenseUpdate }) => updateExpense(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}
