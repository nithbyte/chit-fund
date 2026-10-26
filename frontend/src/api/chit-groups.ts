import { apiClient } from './client';

export interface ChitGroup {
  id: string;
  groupCode: string;
  name: string;
  chitType: 'AUCTION_BASED' | 'FIXED_INSTALLMENT';
  totalValue: number;
  monthlyContribution: number;
  totalMonths: number;
  currentMonth: number;
  startDate: string;
  expectedEndDate: string;
  foremanCommissionRate: number;
  minBidDiscount?: number;
  maxBidDiscount?: number;
  auctionFrequency: string;
  auctionDayOfMonth?: number;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  enrolledMembersCount?: number;
  totalSlots?: number;
  vacantSlots?: number;
  memberships?: any[];
  installments?: any[];
  auctions?: any[];
  payouts?: any[];
}

export const chitGroupsApi = {
  getAll: () => apiClient<ChitGroup[]>('/chit-groups'),

  getById: (id: string) => apiClient<ChitGroup>(`/chit-groups/${id}`),

  create: (data: Partial<ChitGroup>) =>
    apiClient<ChitGroup>('/chit-groups', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  enroll: (
    groupId: string,
    data: { customerId: string; ticketNumber: number; nomineeName?: string; nomineePhone?: string; notes?: string },
  ) =>
    apiClient<any>(`/chit-groups/${groupId}/enroll`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
