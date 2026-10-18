import { apiClient } from './client';
import type { Backup, RestoreResult } from '../types';

export async function getBackups(): Promise<Backup[]> {
  const res = await apiClient.get<Backup[]>('/admin/backups');
  return res.data;
}

export async function createBackup(): Promise<Backup> {
  const res = await apiClient.post<Backup>('/admin/backups');
  return res.data;
}

export async function uploadBackup(file: File): Promise<Backup> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiClient.post<Backup>('/admin/backups/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

/** Downloads through the API (it needs the auth header) and saves the file. */
export async function downloadBackup(name: string): Promise<void> {
  const res = await apiClient.get<Blob>(`/admin/backups/${name}/download`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export async function deleteBackup(name: string): Promise<void> {
  await apiClient.delete(`/admin/backups/${name}`);
}

export async function restoreBackup(name: string, confirm: string): Promise<RestoreResult> {
  const res = await apiClient.post<RestoreResult>(`/admin/backups/${name}/restore`, { confirm });
  return res.data;
}
