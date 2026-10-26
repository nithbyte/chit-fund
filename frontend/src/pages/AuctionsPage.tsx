import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, X, Loader2, AlertCircle } from 'lucide-react';
import { auctionsApi } from '../api/auctions';
import { chitGroupsApi } from '../api/chit-groups';
import { TopHeader } from '../components/layout/TopHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatINR, formatDate } from '../utils/formatters';

export const AuctionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [auctionForm, setAuctionForm] = useState({
    chitGroupId: '',
    monthNumber: 2,
    auctionDate: new Date().toISOString(),
    winningBidAmount: 20000,
    winningMembershipId: '',
    notes: '',
  });

  const { data: auctions, isLoading, error } = useQuery({
    queryKey: ['auctions'],
    queryFn: () => auctionsApi.getAll(),
  });

  const { data: groups } = useQuery({
    queryKey: ['chitGroups'],
    queryFn: chitGroupsApi.getAll,
  });

  const selectedGroup = groups?.find((g) => g.id === auctionForm.chitGroupId);

  const { data: groupDetails } = useQuery({
    queryKey: ['chitGroup', auctionForm.chitGroupId],
    queryFn: () => chitGroupsApi.getById(auctionForm.chitGroupId),
    enabled: !!auctionForm.chitGroupId,
  });

  const recordAuctionMutation = useMutation({
    mutationFn: (data: typeof auctionForm) => auctionsApi.record(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      queryClient.invalidateQueries({ queryKey: ['chitGroups'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      setModalError(err.message || 'Failed to record auction');
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <TopHeader
        title="Auction Records"
        subtitle="Monthly Bids, 5% Commission & Member Dividends"
        rightAction={
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors shadow-xs touch-target"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Conduct Auction</span>
            <span className="sm:hidden">Auction</span>
          </button>
        }
      />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <LoadingSpinner message="Loading auction ledger..." />
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
            Failed to load auction records.
          </div>
        ) : auctions && auctions.length > 0 ? (
          <div className="space-y-3">
            {auctions.map((auc) => (
              <div
                key={auc.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {auc.chitGroup?.groupCode}
                      </span>
                      <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                        Month {auc.monthNumber} Auction
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                      {auc.chitGroup?.name}
                    </h3>
                  </div>

                  <div className="text-xs text-slate-500 flex items-center gap-1 sm:text-right">
                    <Calendar size={13} className="text-slate-400" />
                    <span>Held on {formatDate(auc.auctionDate)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-3 border-b border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Winning Member</span>
                    <span className="font-bold text-slate-900">
                      {auc.winningMembership?.customer?.fullName || 'Winner Enrolled'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Ticket #{auc.winningMembership?.ticketNumber}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Winning Bid Discount</span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {formatINR(auc.winningBidAmount)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Foreman 5% Comm.</span>
                    <span className="font-bold text-teal-800 tabular-nums">
                      {formatINR(auc.foremanCommission)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Dividend / Member</span>
                    <span className="font-bold text-teal-700 tabular-nums">
                      {formatINR(auc.dividendPerMember)}
                    </span>
                  </div>
                </div>

                <div className="pt-2.5 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">
                    Net Prize Payout to Winner:
                  </span>
                  <span className="text-sm font-black text-slate-950 tabular-nums">
                    {formatINR(auc.netPrizeAmount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
            <p className="text-sm text-slate-700 font-medium">No auctions conducted yet</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-3 px-4 py-2 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800"
            >
              Record First Auction
            </button>
          </div>
        )}
      </div>

      {/* Record Auction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Record Monthly Auction Result</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setModalError(null);
                recordAuctionMutation.mutate(auctionForm);
              }}
              className="space-y-3 mt-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Auction Chit Group *
                </label>
                <select
                  required
                  value={auctionForm.chitGroupId}
                  onChange={(e) =>
                    setAuctionForm({ ...auctionForm, chitGroupId: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                >
                  <option value="">-- Choose Active Chit Group --</option>
                  {groups
                    ?.filter((g) => g.chitType === 'AUCTION_BASED')
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.groupCode} • Month {g.currentMonth})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Month Number *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={selectedGroup?.totalMonths || 50}
                    required
                    value={auctionForm.monthNumber}
                    onChange={(e) =>
                      setAuctionForm({ ...auctionForm, monthNumber: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none tabular-nums font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Winning Bid Discount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={auctionForm.winningBidAmount}
                    onChange={(e) =>
                      setAuctionForm({
                        ...auctionForm,
                        winningBidAmount: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none tabular-nums font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Winning Member *
                </label>
                <select
                  required
                  value={auctionForm.winningMembershipId}
                  onChange={(e) =>
                    setAuctionForm({ ...auctionForm, winningMembershipId: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                >
                  <option value="">-- Choose Member Winning the Auction --</option>
                  {groupDetails?.memberships
                    ?.filter((m: any) => !m.isPrized)
                    .map((m: any) => (
                      <option key={m.id} value={m.id}>
                        Ticket #{m.ticketNumber} - {m.customer.fullName} ({m.customer.phone})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Auction Notes / Attendees
                </label>
                <input
                  type="text"
                  value={auctionForm.notes}
                  onChange={(e) => setAuctionForm({ ...auctionForm, notes: e.target.value })}
                  placeholder="e.g. Conducted at 11 AM with 12 members present"
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordAuctionMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {recordAuctionMutation.isPending && (
                    <Loader2 size={14} className="animate-spin" />
                  )}
                  <span>Apply Auction & Dividends</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
