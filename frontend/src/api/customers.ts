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

export interface CustomerListResponse {
  items: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DuplicateMatchItem {
  id: string;
  customerCode: string;
  fullName: string;
  phone: string;
  address?: string;
  isActive: boolean;
}

export interface DuplicateCheckResponse {
  hasMatches: boolean;
  matchingPhone: DuplicateMatchItem[];
  matchingName: DuplicateMatchItem[];
}

export const customersApi = {
  getAll: (filters?: { search?: string; page?: number; limit?: number; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.status) params.append('status', filters.status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient<CustomerListResponse>(`/customers${qs}`);
  },

  checkDuplicate: (phone: string, name?: string) => {
    const params = new URLSearchParams();
    params.append('phone', phone);
    if (name) params.append('name', name);
    return apiClient<DuplicateCheckResponse>(`/customers/check-duplicate?${params.toString()}`);
  },

  getById: (id: string) => apiClient<Customer>(`/customers/${id}`),

  create: (data: Partial<Customer> & { confirmDuplicate?: boolean }) =>
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
