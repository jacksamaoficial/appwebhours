import { apiClient } from './client';
import type { Business, EmployeeCreate, EmployeeUpdate, User } from '../types';

export async function getBusiness(): Promise<Business> {
  const res = await apiClient.get<Business>('/business');
  return res.data;
}

export async function updateBusiness(data: Partial<Pick<Business, 'name' | 'currency'>>): Promise<Business> {
  const res = await apiClient.patch<Business>('/business', data);
  return res.data;
}

export async function getEmployees(): Promise<User[]> {
  const res = await apiClient.get<User[]>('/employees');
  return res.data;
}

export async function createEmployee(data: EmployeeCreate): Promise<User> {
  const res = await apiClient.post<User>('/employees', data);
  return res.data;
}

export async function updateEmployee(id: string, data: EmployeeUpdate): Promise<User> {
  const res = await apiClient.patch<User>(`/employees/${id}`, data);
  return res.data;
}
