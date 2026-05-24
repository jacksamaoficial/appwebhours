import { apiClient } from './client';
import type { TimeEntry, TimeEntryCreate, TimeEntryUpdate } from '../types';

interface ListParams {
  date?: string;
  job_id?: string;
  from_date?: string;
  to_date?: string;
}

export async function getTimeEntries(params: ListParams = {}): Promise<TimeEntry[]> {
  const res = await apiClient.get<TimeEntry[]>('/time-entries', { params });
  return res.data;
}

export async function getTimeEntry(id: string): Promise<TimeEntry> {
  const res = await apiClient.get<TimeEntry>(`/time-entries/${id}`);
  return res.data;
}

export async function createTimeEntry(data: TimeEntryCreate): Promise<TimeEntry> {
  const res = await apiClient.post<TimeEntry>('/time-entries', data);
  return res.data;
}

export async function updateTimeEntry(id: string, data: TimeEntryUpdate): Promise<TimeEntry> {
  const res = await apiClient.patch<TimeEntry>(`/time-entries/${id}`, data);
  return res.data;
}

export async function deleteTimeEntry(id: string): Promise<void> {
  await apiClient.delete(`/time-entries/${id}`);
}
