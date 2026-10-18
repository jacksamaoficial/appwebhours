import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  closeDay,
  getBusinessDays,
  getClosedDays,
  reopenDay,
  setDailySales,
} from '../api/businessDays';
import type { DailySalesUpdate } from '../types';

interface RangeParams {
  from_date?: string;
  to_date?: string;
}

/** Set of closed dates (YYYY-MM-DD) in the range; available to every role. */
export function useClosedDays(params: RangeParams = {}) {
  const query = useQuery({
    queryKey: ['business-days', 'closed', params],
    queryFn: () => getClosedDays(params),
  });
  const closed = useMemo(() => new Set((query.data ?? []).map((d) => d.date)), [query.data]);
  return { ...query, closed };
}

export function useBusinessDays(params: RangeParams = {}, enabled = true) {
  return useQuery({
    queryKey: ['business-days', 'list', params],
    queryFn: () => getBusinessDays(params),
    enabled,
  });
}

export function useSetDailySales() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, data }: { date: string; data: DailySalesUpdate }) =>
      setDailySales(date, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business-days'] }),
  });
}

export function useCloseDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, close }: { date: string; close: boolean }) =>
      close ? closeDay(date) : reopenDay(date),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business-days'] }),
  });
}
