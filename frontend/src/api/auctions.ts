import { apiClient } from './client';

export type AuctionCalculationMode = 'DISCOUNT_BASED' | 'FIXED_PAYOUT';

export interface Auction {
  id: string;
  chitGroupId: string;
  monthNumber: number;
  auctionDate: string;
  auctionCalculationMode?: AuctionCalculationMode;
  winningBidAmount: number;
  foremanCommission: number;
  dividendTotal: number;
  dividendPerMember: number;
  winningMembershipId?: string;
  fixedPayoutAmount?: number | null;
  adjustmentAmount?: number;
  netPrizeAmount: number;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  chitGroup?: {
    id: string;
    groupCode: string;
    name: string;
    totalValue: number;
    auctionCalculationMode?: AuctionCalculationMode;
  };
  winningMembership?: {
    id: string;
    ticketNumber: number;
    customer: {
      id: string;
      fullName: string;
      phone: string;
      customerCode: string;
    };
  };
}

export interface RecordAuctionPayload {
  chitGroupId: string;
  monthNumber: number;
  auctionDate: string;
  auctionCalculationMode?: AuctionCalculationMode;
  winningBidAmount?: number;
  fixedPayoutAmount?: number;
  adjustmentAmount?: number;
  winningMembershipId: string;
  notes?: string;
}

export interface AuctionPreviewPayload {
  chitGroupId: string;
  monthNumber: number;
  auctionCalculationMode?: AuctionCalculationMode;
  winningBidAmount?: number;
  fixedPayoutAmount?: number;
  adjustmentAmount?: number;
  winningMembershipId?: string;
}

export interface AuctionPreviewResult {
  chitGroupId: string;
  groupCode: string;
  groupName: string;
  monthNumber: number;
  auctionCalculationMode: AuctionCalculationMode;
  totalValue: number;
  totalMembers: number;
  winningBidAmount: number;
  foremanCommission: number;
  dividendTotal: number;
  dividendPerMember: number;
  fixedPayoutAmount?: number | null;
  adjustmentAmount: number;
  netPrizeAmount: number;
  baseInstallmentAmount: number;
  nextInstallmentPayable: number;
  commissionRuleSummary: string;
  discountDistributionSummary: string;
  isDuplicate: boolean;
  winnerError?: string | null;
  winningMember?: {
    id: string;
    ticketNumber: number;
    customerName: string;
    phone: string;
    isPrized: boolean;
  } | null;
}

export const auctionsApi = {
  getAll: (chitGroupId?: string) => {
    const qs = chitGroupId ? `?chitGroupId=${chitGroupId}` : '';
    return apiClient<Auction[]>(`/auctions${qs}`);
  },

  preview: (payload: AuctionPreviewPayload) =>
    apiClient<AuctionPreviewResult>('/auctions/preview', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  record: (payload: RecordAuctionPayload) =>
    apiClient<Auction>('/auctions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
