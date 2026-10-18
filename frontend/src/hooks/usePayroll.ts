import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPayroll, getPaySchedule, setPaySchedule } from '../api/payroll';
import type { PayScheduleUpdate } from '../types';

export function usePaySchedule(userId: string) {
  return useQuery({
    queryKey: ['pay-schedule', userId],
    queryFn: () => getPaySchedule(userId),
  });
}

export function useSetPaySchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: PayScheduleUpdate }) =>
      setPaySchedule(userId, data),
    onSuccess: (_data, { userId }) => {
      void qc.invalidateQueries({ queryKey: ['pay-schedule', userId] });
      void qc.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function usePayroll(params: { from_date: string; to_date: string }) {
  return useQuery({
    queryKey: ['payroll', params],
    queryFn: () => getPayroll(params),
  });
}
