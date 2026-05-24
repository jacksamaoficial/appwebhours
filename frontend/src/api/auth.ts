import { apiClient, setAccessToken } from './client';
import type { LoginRequest, RegisterRequest, TokenResponse, User } from '../types';

export async function register(data: RegisterRequest): Promise<TokenResponse> {
  const res = await apiClient.post<TokenResponse>('/auth/register', data);
  setAccessToken(res.data.access_token);
  return res.data;
}

export async function login(data: LoginRequest): Promise<TokenResponse> {
  const res = await apiClient.post<TokenResponse>('/auth/login', data);
  setAccessToken(res.data.access_token);
  return res.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
  setAccessToken(null);
}

export async function getMe(): Promise<User> {
  const res = await apiClient.get<User>('/auth/me');
  return res.data;
}
