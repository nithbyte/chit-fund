import { apiClient } from './client';

export interface DashboardDueItem {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerCode: string;
  chitGroupId: string;
  groupCode: string;
  groupName: string;
  ticketNumber: number;
  monthNumber: number;
  dueDate: string;
  remainingDue: number;
}

export interface DashboardStats {
  financials: {
    collectionsToday: number;
    collectionsCountToday: number;
    collectionsSelectedRange: number;
    collectionsCountSelectedRange: number;
    rangeStartDate: string;
    rangeEndDate: string;
    modeTotals: {
      cash: number;
      upi: number;
      bankTransfer: number;
      cheque: number;
    };
    totalPendingDues: number;
    dueToday: {
      count: number;
      amount: number;
      items: DashboardDueItem[];
    };
    overdue: {
      count: number;
      amount: number;
      items: DashboardDueItem[];
    };
    foremanCommissionEarned: number;
    auctionsConducted: number;
  };
  operations: {
    activeCustomersCount: number;
    activeGroupsCount: number;
  };
  recentCollections: {
    id: string;
    receiptNumber: string;
    customerName: string;
    customerPhone: string;
    customerCode: string;
    amount: number;
    paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
    paymentDate: string;
    transactionRef?: string;
  }[];
  upcomingGroups: {
    id: string;
    groupCode: string;
    name: string;
    currentMonth: number;
    totalMonths: number;
    auctionDayOfMonth?: number;
    monthlyContribution: number;
  }[];
}

export const dashboardApi = {
  getStats: (filters?: { startDate?: string; endDate?: string }) => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient<DashboardStats>(`/dashboard/stats${qs}`);
  },
};
