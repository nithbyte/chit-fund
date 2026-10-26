import { apiClient } from './client';

export interface SchemeTemplate {
  templateId: string;
  name: string;
  chitType: 'AUCTION_BASED' | 'FIXED_INSTALLMENT';
  frequency: 'WEEKLY' | 'MONTHLY';
  installmentAmount: number;
  durationPeriods: number;
  durationLabel: string;
  expectedMemberContribution: number;
  totalChitValue: number;
  defaultCommissionRate: number;
  requiresMemberConfirmation: boolean;
  requiresPayoutConfirmation: boolean;
  notes: string;
  payoutRuleSummary: string;
}

export interface ActivateChitGroupPayload {
  startDate: string;
  totalMonths: number;
  foremanCommissionRate?: number;
  minBidDiscount?: number;
  maxBidDiscount?: number;
  payoutRuleNotes?: string;
  confirmActivation: boolean;
}

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
  isWeekly?: boolean;
  memberships?: any[];
  installments?: any[];
  auctions?: any[];
  payouts?: any[];
}

export const chitGroupsApi = {
  getTemplates: () => apiClient<SchemeTemplate[]>('/chit-groups/templates'),

  getAll: () => apiClient<ChitGroup[]>('/chit-groups'),

  getById: (id: string) => apiClient<ChitGroup>(`/chit-groups/${id}`),

  create: (data: Partial<ChitGroup>) =>
    apiClient<ChitGroup>('/chit-groups', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  activate: (id: string, payload: ActivateChitGroupPayload) =>
    apiClient<ChitGroup>(`/chit-groups/${id}/activate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  generateSchedule: (id: string) =>
    apiClient<{
      groupId: string;
      totalSlots: number;
      existingCount: number;
      newlyCreatedCount: number;
      frequency: string;
    }>(`/chit-groups/${id}/generate-schedule`, {
      method: 'POST',
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
