import { apiClient } from './client';

export interface Auction {
  id: string;
  chitGroupId: string;
  monthNumber: number;
  auctionDate: string;
  winningBidAmount: number;
  foremanCommission: number;
  dividendTotal: number;
  dividendPerMember: number;
  winningMembershipId?: string;
  netPrizeAmount: number;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  chitGroup?: {
    id: string;
    groupCode: string;
    name: string;
    totalValue: number;
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
  winningBidAmount: number;
  winningMembershipId: string;
  notes?: string;
}

export const auctionsApi = {
  getAll: (chitGroupId?: string) => {
    const qs = chitGroupId ? `?chitGroupId=${chitGroupId}` : '';
    return apiClient<Auction[]>(`/auctions${qs}`);
  },

  record: (payload: RecordAuctionPayload) =>
    apiClient<Auction>('/auctions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
