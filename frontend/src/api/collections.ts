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
  isOverdue?: boolean;
  isWeekly?: boolean;
  periodLabel?: string;
  frequency?: string;
}

export interface CustomerMembershipSummary {
  id: string;
  ticketNumber: number;
  chitGroup: {
    id: string;
    groupCode: string;
    name: string;
    status: string;
    totalValue: number;
    monthlyContribution: number;
    currentMonth: number;
  };
}

export interface CustomerDuesResponse {
  customer: {
    id: string;
    fullName: string;
    phone: string;
    customerCode: string;
  };
  memberships: CustomerMembershipSummary[];
  recentPayment: {
    id: string;
    receiptNumber: string;
    amount: number;
    paymentDate: string;
    paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
    transactionRef?: string;
  } | null;
  pendingInstallments: PendingInstallment[];
  totalDueAmount: number;
}

export interface PaymentAllocationItem {
  id: string;
  paymentId: string;
  membershipId: string;
  installmentId: string;
  allocatedAmount: number;
  notes?: string;
  installment?: {
    id: string;
    monthNumber: number;
    dueDate: string;
    payableAmount: number;
    chitGroup?: {
      id: string;
      groupCode: string;
      name: string;
    };
  };
  membership?: {
    id: string;
    ticketNumber: number;
  };
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
  customer?: {
    id: string;
    customerCode: string;
    fullName: string;
    phone: string;
    address?: string;
  };
  receivedBy?: {
    id: string;
    fullName: string;
    username: string;
  };
  allocations?: PaymentAllocationItem[];
}

export interface CollectionsRegisterResponse {
  payments: PaymentReceipt[];
  totals: {
    count: number;
    cashTotal: number;
    upiTotal: number;
    bankTotal: number;
    chequeTotal: number;
    grandTotal: number;
  };
}

export interface RecordCollectionPayload {
  customerId: string;
  amount: number;
  paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
  paymentDate?: string;
  transactionRef?: string;
  notes?: string;
  idempotencyKey?: string;
  allocations: {
    installmentId: string;
    membershipId: string;
    allocatedAmount: number;
    notes?: string;
  }[];
}

export const collectionsApi = {
  getAll: (filters?: {
    customerId?: string;
    startDate?: string;
    endDate?: string;
    paymentMode?: string;
    receiptNumber?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.customerId) params.append('customerId', filters.customerId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.paymentMode) params.append('paymentMode', filters.paymentMode);
    if (filters?.receiptNumber) params.append('receiptNumber', filters.receiptNumber);
    if (filters?.search) params.append('search', filters.search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient<CollectionsRegisterResponse>(`/collections${qs}`);
  },

  getById: (id: string) => apiClient<PaymentReceipt>(`/collections/${id}`),

  getCustomerDues: (customerId: string, membershipId?: string) => {
    const qs = membershipId ? `?membershipId=${encodeURIComponent(membershipId)}` : '';
    return apiClient<CustomerDuesResponse>(`/collections/customer/${customerId}/dues${qs}`);
  },

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
