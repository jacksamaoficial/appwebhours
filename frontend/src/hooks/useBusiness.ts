import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createEmployee, getBusiness, getEmployees, updateEmployee } from '../api/business';
import type { EmployeeCreate, EmployeeUpdate } from '../types';

export function useBusiness() {
  return useQuery({ queryKey: ['business'], queryFn: getBusiness });
}

export function useEmployees(enabled = true) {
  return useQuery({ queryKey: ['employees'], queryFn: getEmployees, enabled });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EmployeeCreate) => createEmployee(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EmployeeUpdate }) => updateEmployee(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}
