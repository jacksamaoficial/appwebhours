import { apiClient } from './client';
import type { Job, JobCreate, JobUpdate } from '../types';

export async function getJobs(activeOnly = true): Promise<Job[]> {
  const res = await apiClient.get<Job[]>('/jobs', { params: { active_only: activeOnly } });
  return res.data;
}

export async function getJob(id: string): Promise<Job> {
  const res = await apiClient.get<Job>(`/jobs/${id}`);
  return res.data;
}

export async function createJob(data: JobCreate): Promise<Job> {
  const res = await apiClient.post<Job>('/jobs', data);
  return res.data;
}

export async function updateJob(id: string, data: JobUpdate): Promise<Job> {
  const res = await apiClient.patch<Job>(`/jobs/${id}`, data);
  return res.data;
}

export async function archiveJob(id: string): Promise<void> {
  await apiClient.delete(`/jobs/${id}`);
}
