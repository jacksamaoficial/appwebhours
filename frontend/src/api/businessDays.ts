import { apiClient } from './client';
import type { BusinessDay, DailySalesUpdate, DayStatus } from '../types';

interface RangeParams {
  from_date?: string;
  to_date?: string;
}

export async function getClosedDays(params: RangeParams = {}): Promise<DayStatus[]> {
  const res = await apiClient.get<DayStatus[]>('/business-days/closed', { params });
  return res.data;
}

export async function getBusinessDays(params: RangeParams = {}): Promise<BusinessDay[]> {
  const res = await apiClient.get<BusinessDay[]>('/business-days', { params });
  return res.data;
}

export async function setDailySales(date: string, data: DailySalesUpdate): Promise<BusinessDay> {
  const res = await apiClient.put<BusinessDay>(`/business-days/${date}/sales`, data);
  return res.data;
}

export async function closeDay(date: string): Promise<BusinessDay> {
  const res = await apiClient.post<BusinessDay>(`/business-days/${date}/close`);
  return res.data;
}

export async function reopenDay(date: string): Promise<BusinessDay> {
  const res = await apiClient.post<BusinessDay>(`/business-days/${date}/reopen`);
  return res.data;
}
