import { apiClient } from './client';

export interface PayoutItem {
  id: string;
  voucherNumber: string;
  chitGroupId: string;
  groupCode: string;
  groupName: string;
  membershipId: string;
  customerId: string;
  customerCode: string;
  winnerName: string;
  winnerPhone: string;
  ticketNumber: number;
  auctionId: string;
  auctionMonth: number;
  grossPrizeAmount: number;
  deductionAmount: number;
  netPaidAmount: number;
  payoutDate: string;
  paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
  transactionRef?: string;
  guarantor1?: string | null;
  guarantor2?: string | null;
  guarantorName1?: string;
  guarantorPhone1?: string;
  guarantorName2?: string;
  guarantorPhone2?: string;
  status: 'PENDING_APPROVAL' | 'DISBURSED' | 'CANCELLED';
  disbursedBy: string;
  notes?: string;
  createdAt: string;
}

export interface RecordPayoutPayload {
  chitGroupId: string;
  membershipId: string;
  auctionId: string;
  grossPrizeAmount: number;
  deductionAmount?: number;
  netPaidAmount: number;
  payoutDate?: string;
  paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
  transactionRef?: string;
  guarantorName1?: string;
  guarantorPhone1?: string;
  guarantorName2?: string;
  guarantorPhone2?: string;
  notes?: string;
}

export const payoutsApi = {
  getAll: (filters?: { chitGroupId?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.chitGroupId) params.append('chitGroupId', filters.chitGroupId);
    if (filters?.status) params.append('status', filters.status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient<PayoutItem[]>(`/payouts${qs}`);
  },

  getById: (id: string) => apiClient<PayoutItem>(`/payouts/${id}`),

  record: (payload: RecordPayoutPayload) =>
    apiClient<PayoutItem>('/payouts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
