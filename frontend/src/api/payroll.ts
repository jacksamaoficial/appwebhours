import { apiClient } from './client';
import type { EmployeePayroll, PaySchedule, PayScheduleUpdate } from '../types';

export async function getPaySchedule(userId: string): Promise<PaySchedule> {
  const res = await apiClient.get<PaySchedule>(`/employees/${userId}/pay-schedule`);
  return res.data;
}

export async function setPaySchedule(userId: string, data: PayScheduleUpdate): Promise<PaySchedule> {
  const res = await apiClient.put<PaySchedule>(`/employees/${userId}/pay-schedule`, data);
  return res.data;
}

export async function getPayroll(params: {
  from_date: string;
  to_date: string;
  user_id?: string;
}): Promise<EmployeePayroll[]> {
  const res = await apiClient.get<EmployeePayroll[]>('/payroll', { params });
  return res.data;
}
