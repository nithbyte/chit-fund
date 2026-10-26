import { apiClient } from './client';

export interface DailyCollectionReportResponse {
  reportDate: string;
  summary: {
    totalReceipts: number;
    validReceipts: number;
    reversedReceipts: number;
    cashTotal: number;
    upiTotal: number;
    bankTotal: number;
    validTotal: number;
    reversedTotal: number;
  };
  items: {
    id: string;
    receiptNumber: string;
    paymentDate: string;
    customerCode: string;
    customerName: string;
    phone: string;
    amount: number;
    paymentMode: string;
    transactionRef?: string;
    isReversed: boolean;
    reversalReason?: string;
    allocationsCount: number;
  }[];
}

export interface DateRangeReportResponse {
  startDate: string;
  endDate: string;
  totals: {
    count: number;
    totalAmount: number;
    cashTotal: number;
    upiTotal: number;
    bankTotal: number;
  };
  items: {
    id: string;
    receiptNumber: string;
    paymentDate: string;
    customerCode: string;
    customerName: string;
    amount: number;
    paymentMode: string;
    transactionRef?: string;
  }[];
}

export interface CustomerOutstandingItem {
  customerId: string;
  customerCode: string;
  fullName: string;
  phone: string;
  address?: string;
  activeChitsCount: number;
  totalDue: number;
  overdueAmount: number;
  overdueCount: number;
}

export interface CustomerOutstandingReportResponse {
  summary: {
    totalCustomers: number;
    portfolioTotalDue: number;
    portfolioOverdue: number;
  };
  items: CustomerOutstandingItem[];
}

export interface GroupWiseReportItem {
  id: string;
  groupCode: string;
  name: string;
  chitType: string;
  totalValue: number;
  monthlyContribution: number;
  currentMonth: number;
  totalMonths: number;
  status: string;
  enrolledMembers: number;
  totalInstallmentExpected: number;
  totalCollected: number;
  totalPending: number;
  collectionEfficiency: number;
  auctionsHeld: number;
}

export interface ReversalsReportResponse {
  count: number;
  totalReversedAmount: number;
  items: {
    id: string;
    receiptNumber: string;
    originalPaymentDate: string;
    reversedAt: string;
    reversalReason?: string;
    customerCode: string;
    customerName: string;
    amount: number;
    paymentMode: string;
    receivedBy: string;
  }[];
}

export interface CustomerStatementResponse {
  customer: {
    id: string;
    customerCode: string;
    fullName: string;
    phone: string;
    address?: string;
  };
  summary: {
    totalPayableToDate: number;
    totalPaid: number;
    currentBalanceDue: number;
  };
  memberships: {
    id: string;
    groupCode: string;
    groupName: string;
    ticketNumber: number;
    isPrized: boolean;
    prizedMonth?: number;
    prizeAmount?: number;
  }[];
  ledgerTransactions: {
    id: string;
    receiptNumber: string;
    date: string;
    amount: number;
    paymentMode: string;
    transactionRef?: string;
    isReversed: boolean;
    reversalReason?: string;
    allocations: {
      groupCode: string;
      monthNumber: number;
      allocatedAmount: number;
    }[];
  }[];
}

export const reportsApi = {
  getDailyCollection: (date?: string) => {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return apiClient<DailyCollectionReportResponse>(`/reports/daily-collection${qs}`);
  },

  getDateRangeCollection: (startDate: string, endDate: string) =>
    apiClient<DateRangeReportResponse>(
      `/reports/date-range-collection?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
    ),

  getCustomerOutstanding: () =>
    apiClient<CustomerOutstandingReportResponse>('/reports/customer-outstanding'),

  getGroupWise: () =>
    apiClient<GroupWiseReportItem[]>('/reports/group-wise'),

  getReversals: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient<ReversalsReportResponse>(`/reports/reversals${qs}`);
  },

  getCustomerStatement: (customerId: string) =>
    apiClient<CustomerStatementResponse>(`/reports/customer-statement/${customerId}`),
};
