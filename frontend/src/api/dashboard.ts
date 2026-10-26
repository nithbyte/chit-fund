import { apiClient } from './client';

export interface DashboardStats {
  financials: {
    collectionsThisMonth: number;
    collectionsCountThisMonth: number;
    collectionsToday: number;
    collectionsCountToday: number;
    totalPendingDues: number;
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
  getStats: () => apiClient<DashboardStats>('/dashboard/stats'),
};
