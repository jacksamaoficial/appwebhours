import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { archiveJob, createJob, getJobs, updateJob } from '../api/jobs';
import type { JobCreate, JobUpdate } from '../types';

export function useJobs(activeOnly = true) {
  return useQuery({
    queryKey: ['jobs', { activeOnly }],
    queryFn: () => getJobs(activeOnly),
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: JobCreate) => createJob(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: JobUpdate }) => updateJob(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });
}

export function useArchiveJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });
}
