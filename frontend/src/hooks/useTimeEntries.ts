import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTimeEntry,
  deleteTimeEntry,
  getTimeEntries,
  updateTimeEntry,
} from '../api/timeEntries';
import type { TimeEntryCreate, TimeEntryUpdate } from '../types';

interface UseTimeEntriesParams {
  date?: string;
  job_id?: string;
  from_date?: string;
  to_date?: string;
}

export function useTimeEntries(params: UseTimeEntriesParams = {}) {
  return useQuery({
    queryKey: ['time-entries', params],
    queryFn: () => getTimeEntries(params),
  });
}

export function useCreateTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TimeEntryCreate) => createTimeEntry(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-entries'] }),
  });
}

export function useUpdateTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TimeEntryUpdate }) =>
      updateTimeEntry(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-entries'] }),
  });
}

export function useDeleteTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTimeEntry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-entries'] }),
  });
}
