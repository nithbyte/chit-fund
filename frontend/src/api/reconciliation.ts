import { apiClient } from './client';

export interface DailyReport {
  date: string;
  systemTotals: {
    systemCashTotal: number;
    systemUpiTotal: number;
    systemBankTotal: number;
    systemTotal: number;
    validCount: number;
    reversedCount: number;
    reversedTotal: number;
  };
  actuals: {
    actualCashCounted: number | null;
    actualUpiVerified: number | null;
    actualBankVerified: number | null;
    discrepancyNote: string | null;
    status: 'UNRECONCILED' | 'RECONCILED' | 'DISCREPANCY';
    reconciledAt: string | null;
    reconciledBy: string | null;
  };
  discrepancy: {
    cash: number | null;
    upi: number | null;
    bank: number | null;
    total: number | null;
  };
  transactions: {
    id: string;
    receiptNumber: string;
    customerName: string;
    customerCode: string;
    amount: number;
    paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
    paymentDate: string;
    transactionRef?: string;
  }[];
  reversals: {
    id: string;
    receiptNumber: string;
    customerName: string;
    customerCode: string;
    amount: number;
    paymentMode: string;
    paymentDate: string;
    reversalReason?: string;
    reversedAt?: string;
  }[];
}

export interface SaveReconciliationPayload {
  date: string;
  actualCashCounted?: number;
  actualUpiVerified?: number;
  actualBankVerified?: number;
  discrepancyNote?: string;
}

export const reconciliationApi = {
  getDailyReport: (date?: string) => {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return apiClient<DailyReport>(`/reconciliation/daily${qs}`);
  },

  saveDaily: (payload: SaveReconciliationPayload) =>
    apiClient<DailyReport>('/reconciliation/save', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
