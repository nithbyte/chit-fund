import { apiClient } from './client';

export interface SystemSettings {
  company_name: string;
  company_address: string;
  company_phone: string;
  company_proprietor: string;
  company_tagline?: string;
  business_timezone: string;
}

export const settingsApi = {
  getAll: () => apiClient<SystemSettings>('/settings'),
  update: (updates: Partial<SystemSettings>) =>
    apiClient<SystemSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
};
