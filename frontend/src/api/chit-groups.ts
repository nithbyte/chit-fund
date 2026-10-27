import { apiClient } from './client';

export type CommissionType =
  | 'NOT_CONFIGURED'
  | 'NO_COMMISSION'
  | 'PERCENTAGE_OF_CHIT_VALUE'
  | 'PERCENTAGE_OF_EACH_COLLECTION'
  | 'FIXED_AMOUNT_PER_INSTALLMENT'
  | 'FIXED_AMOUNT_PER_CHIT_GROUP'
  | 'AUCTION_BASED_EARNINGS'
  | 'CUSTOM_OTHER';

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
  defaultCommissionType?: CommissionType;
  defaultCommissionRate?: number;
  defaultCommissionAmount?: number;
  commissionCalculationBase?: string;
  requiresMemberConfirmation: boolean;
  requiresPayoutConfirmation: boolean;
  notes: string;
  payoutRuleSummary: string;
}

export interface ActivateChitGroupPayload {
  startDate: string;
  totalMonths: number;
  foremanCommissionRate?: number;
  commissionType?: CommissionType;
  commissionRate?: number;
  commissionAmount?: number;
  commissionCalculationBase?: string;
  commissionNotes?: string;
  isCommissionConfirmed?: boolean;
  minBidDiscount?: number;
  maxBidDiscount?: number;
  payoutRuleNotes?: string;
  confirmActivation: boolean;
}

export type AuctionCalculationMode = 'DISCOUNT_BASED' | 'FIXED_PAYOUT';

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
  commissionType?: CommissionType;
  commissionRate?: number;
  commissionAmount?: number;
  commissionCalculationBase?: string;
  commissionNotes?: string;
  isCommissionConfirmed?: boolean;
  minBidDiscount?: number;
  maxBidDiscount?: number;
  auctionFrequency: string;
  auctionDayOfMonth?: number;
  auctionCalculationMode?: AuctionCalculationMode;
  fixedPayoutAmount?: number;
  fixedPayoutAdjustments?: number;
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

  updateCommission: (
    id: string,
    payload: {
      commissionType: CommissionType;
      commissionRate?: number;
      commissionAmount?: number;
      commissionCalculationBase?: string;
      commissionNotes?: string;
      isCommissionConfirmed: boolean;
    },
  ) =>
    apiClient<ChitGroup>(`/chit-groups/${id}/commission`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  updateAuctionMode: (
    id: string,
    payload: {
      auctionCalculationMode: AuctionCalculationMode;
      fixedPayoutAmount?: number;
      fixedPayoutAdjustments?: number;
    },
  ) =>
    apiClient<ChitGroup>(`/chit-groups/${id}/auction-mode`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};
