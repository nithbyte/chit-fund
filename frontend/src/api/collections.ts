import { apiClient } from './client';

export interface PendingInstallment {
  membershipId: string;
  ticketNumber: number;
  groupId: string;
  groupCode: string;
  groupName: string;
  installmentId: string;
  monthNumber: number;
  dueDate: string;
  payableAmount: number;
  paidAlready: number;
  dueAmount: number;
}

export interface CustomerDuesResponse {
  customer: {
    id: string;
    fullName: string;
    phone: string;
    customerCode: string;
  };
  pendingInstallments: PendingInstallment[];
  totalDueAmount: number;
}

export interface PaymentReceipt {
  id: string;
  receiptNumber: string;
  customerId: string;
  amount: number;
  paymentDate: string;
  paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
  transactionRef?: string;
  notes?: string;
  status: 'COMPLETED' | 'REVERSED' | 'PENDING';
  isReversed: boolean;
  reversalReason?: string;
  reversedAt?: string;
  createdAt: string;
  customer?: any;
  receivedBy?: any;
  allocations?: any[];
}

export interface RecordCollectionPayload {
  customerId: string;
  amount: number;
  paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
  paymentDate?: string;
  transactionRef?: string;
  notes?: string;
  allocations: {
    installmentId: string;
    membershipId: string;
    allocatedAmount: number;
    notes?: string;
  }[];
}

export const collectionsApi = {
  getAll: (filters?: { customerId?: string; startDate?: string; endDate?: string }) => {
    const params = new URLSearchParams();
    if (filters?.customerId) params.append('customerId', filters.customerId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient<PaymentReceipt[]>(`/collections${qs}`);
  },

  getById: (id: string) => apiClient<PaymentReceipt>(`/collections/${id}`),

  getCustomerDues: (customerId: string) =>
    apiClient<CustomerDuesResponse>(`/collections/customer/${customerId}/dues`),

  record: (payload: RecordCollectionPayload) =>
    apiClient<PaymentReceipt>('/collections', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  reverse: (id: string, reason: string) =>
    apiClient<PaymentReceipt>(`/collections/${id}/reverse`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};
