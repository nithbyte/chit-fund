import { apiClient } from './client';

export interface Customer {
  id: string;
  customerCode: string;
  fullName: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  identityProofType?: string;
  identityProofNumber?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  activeMembershipsCount?: number;
  memberships?: any[];
  payments?: any[];
  summary?: {
    totalPaid: number;
    totalDues: number;
  };
}

export const customersApi = {
  getAll: (search?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiClient<Customer[]>(`/customers${query}`);
  },

  getById: (id: string) => apiClient<Customer>(`/customers/${id}`),

  create: (data: Partial<Customer>) =>
    apiClient<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Customer>) =>
    apiClient<Customer>(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
