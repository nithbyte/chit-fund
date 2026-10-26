import { apiClient } from './client';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  phone?: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export const authApi = {
  login: (credentials: { username: string; password: string }) =>
    apiClient<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  getProfile: () => apiClient<User>('/auth/me'),

  logout: () => apiClient<{ success: boolean }>('/auth/logout', { method: 'POST' }),
};
