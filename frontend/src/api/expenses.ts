import { apiClient } from './client';

export interface ExpenseItem {
  id: string;
  title: string;
  category: string;
  amount: number;
  expenseDate: string;
  paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
  reference?: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface ExpensesResponse {
  expenses: ExpenseItem[];
  totals: {
    count: number;
    totalAmount: number;
    categoryTotals: Record<string, number>;
    modeTotals: Record<string, number>;
  };
}

export interface CreateExpensePayload {
  title: string;
  category: string;
  amount: number;
  expenseDate?: string;
  paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
  reference?: string;
  notes?: string;
}

export const expensesApi = {
  getAll: (filters?: { startDate?: string; endDate?: string; category?: string }) => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.category) params.append('category', filters.category);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient<ExpensesResponse>(`/expenses${qs}`);
  },

  create: (payload: CreateExpensePayload) =>
    apiClient<ExpenseItem>('/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  remove: (id: string) =>
    apiClient<{ success: boolean; message: string }>(`/expenses/${id}`, {
      method: 'DELETE',
    }),
};
