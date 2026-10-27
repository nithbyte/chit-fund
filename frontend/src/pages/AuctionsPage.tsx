import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Calendar,
  X,
  Loader2,
  AlertCircle,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { auctionsApi, type AuctionCalculationMode } from '../api/auctions';
import { chitGroupsApi } from '../api/chit-groups';
import { TopHeader } from '../components/layout/TopHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatINR, formatDate, formatINRDecimals } from '../utils/formatters';

const getInitialDate = () => new Date().toISOString().split('T')[0];

export const AuctionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [auctionForm, setAuctionForm] = useState(() => ({
    chitGroupId: '',
    monthNumber: 1,
    auctionDate: getInitialDate(),
    auctionCalculationMode: 'DISCOUNT_BASED' as AuctionCalculationMode,
    winningBidAmount: 20000,
    fixedPayoutAmount: 95000,
    adjustmentAmount: 0,
    winningMembershipId: '',
    notes: '',
  }));

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

  // When selected chit group changes, prefill mode and appropriate defaults
  const handleGroupSelect = (groupId: string) => {
    const grp = groups?.find((g) => g.id === groupId);
    if (!grp) {
      setAuctionForm((prev) => ({ ...prev, chitGroupId: '' }));
      return;
    }

    const defaultMode = grp.auctionCalculationMode || 'DISCOUNT_BASED';
    const totalVal = Number(grp.totalValue);
    const configuredFixedPayout = grp.fixedPayoutAmount !== undefined && grp.fixedPayoutAmount !== null
      ? Number(grp.fixedPayoutAmount)
      : Math.round(totalVal * 0.95);
    const configuredAdjustments = grp.fixedPayoutAdjustments !== undefined && grp.fixedPayoutAdjustments !== null
      ? Number(grp.fixedPayoutAdjustments)
      : 0;
    const defaultBid = grp.minBidDiscount ? Number(grp.minBidDiscount) : Math.round(totalVal * 0.15);

    setAuctionForm((prev) => ({
      ...prev,
      chitGroupId: groupId,
      monthNumber: grp.currentMonth || 1,
      auctionCalculationMode: defaultMode,
      fixedPayoutAmount: configuredFixedPayout,
      adjustmentAmount: configuredAdjustments,
      winningBidAmount: defaultBid,
      winningMembershipId: '',
    }));
  };

  // Live calculation preview query from backend
  const { data: preview } = useQuery({
    queryKey: [
      'auctionPreview',
      auctionForm.chitGroupId,
      auctionForm.monthNumber,
      auctionForm.auctionCalculationMode,
      auctionForm.winningBidAmount,
      auctionForm.fixedPayoutAmount,
      auctionForm.adjustmentAmount,
      auctionForm.winningMembershipId,
    ],
    queryFn: () =>
      auctionsApi.preview({
        chitGroupId: auctionForm.chitGroupId,
        monthNumber: Number(auctionForm.monthNumber),
        auctionCalculationMode: auctionForm.auctionCalculationMode,
        winningBidAmount: Number(auctionForm.winningBidAmount || 0),
        fixedPayoutAmount: Number(auctionForm.fixedPayoutAmount || 0),
        adjustmentAmount: Number(auctionForm.adjustmentAmount || 0),
        winningMembershipId: auctionForm.winningMembershipId || undefined,
      }),
    enabled: !!auctionForm.chitGroupId && Number(auctionForm.monthNumber) > 0,
    retry: false,
  });

  const recordAuctionMutation = useMutation({
    mutationFn: (data: typeof auctionForm) =>
      auctionsApi.record({
        chitGroupId: data.chitGroupId,
        monthNumber: Number(data.monthNumber),
        auctionDate: new Date(data.auctionDate).toISOString(),
        auctionCalculationMode: data.auctionCalculationMode,
        winningBidAmount:
          data.auctionCalculationMode === 'DISCOUNT_BASED'
            ? Number(data.winningBidAmount || 0)
            : 0,
        fixedPayoutAmount:
          data.auctionCalculationMode === 'FIXED_PAYOUT'
            ? Number(data.fixedPayoutAmount || 0)
            : undefined,
        adjustmentAmount:
          data.auctionCalculationMode === 'FIXED_PAYOUT'
            ? Number(data.adjustmentAmount || 0)
            : undefined,
        winningMembershipId: data.winningMembershipId,
        notes: data.notes?.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      queryClient.invalidateQueries({ queryKey: ['chitGroups'] });
      queryClient.invalidateQueries({ queryKey: ['chitGroup', auctionForm.chitGroupId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setIsModalOpen(false);
      setModalError(null);
    },
    onError: (err: any) => {
      setModalError(err.message || 'Failed to record auction');
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <TopHeader
        title="Auction Records"
        subtitle="Monthly Bids, Fixed Payouts, Commission & Member Dividends"
        rightAction={
          <button
            onClick={() => {
              setModalError(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors shadow-xs touch-target"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Record Auction Result</span>
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
            {auctions.map((auc) => {
              const isFixed = auc.auctionCalculationMode === 'FIXED_PAYOUT';
              return (
                <div
                  key={auc.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {auc.chitGroup?.groupCode}
                        </span>
                        <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                          Month {auc.monthNumber}
                        </span>
                        {isFixed ? (
                          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                            Fixed Payout Mode
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Discount-Based Auction
                          </span>
                        )}
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

                    {isFixed ? (
                      <>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Fixed Agreed Payout</span>
                          <span className="font-bold text-slate-900 tabular-nums">
                            {formatINR(auc.fixedPayoutAmount || auc.netPrizeAmount)}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[11px]">Explicit Adjustments</span>
                          <span className="font-bold text-slate-700 tabular-nums">
                            {Number(auc.adjustmentAmount || 0) > 0
                              ? `-${formatINR(auc.adjustmentAmount)}`
                              : '₹0'}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[11px]">Member Dividend</span>
                          <span className="font-semibold text-slate-400">
                            None (Fixed Payout)
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Winning Bid Discount</span>
                          <span className="font-bold text-slate-900 tabular-nums">
                            {formatINR(auc.winningBidAmount)}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[11px]">Foreman Commission</span>
                          <span className="font-bold text-teal-800 tabular-nums">
                            {formatINR(auc.foremanCommission)}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[11px]">Dividend / Member</span>
                          <span className="font-bold text-teal-700 tabular-nums">
                            {formatINRDecimals(auc.dividendPerMember)}
                          </span>
                        </div>
                      </>
                    )}
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
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
            <p className="text-sm text-slate-700 font-medium">No auctions conducted yet</p>
            <button
              onClick={() => {
                setModalError(null);
                setIsModalOpen(true);
              }}
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
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Monthly Auction Result</h3>
                <p className="text-xs text-slate-500">
                  Select calculation mode, record bids or fixed payouts, and preview ledger updates.
                </p>
              </div>
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
              className="space-y-4 mt-4"
            >
              {/* Chit Group Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chit Group *
                </label>
                <select
                  required
                  value={auctionForm.chitGroupId}
                  onChange={(e) => handleGroupSelect(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                >
                  <option value="">-- Choose Active Chit Group --</option>
                  {groups
                    ?.filter((g) => g.status === 'ACTIVE')
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.groupCode} • Month {g.currentMonth}/{g.totalMonths} •{' '}
                        {g.auctionCalculationMode === 'FIXED_PAYOUT'
                          ? 'Fixed Payout'
                          : 'Discount Auction'}
                        )
                      </option>
                    ))}
                </select>
              </div>

              {/* Auction Calculation Mode Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Auction Calculation Mode *
                  </label>
                  {selectedGroup?.auctionCalculationMode && (
                    <span className="text-[11px] text-teal-800 font-medium">
                      Group Default: {selectedGroup.auctionCalculationMode === 'FIXED_PAYOUT' ? 'Fixed Payout' : 'Discount-Based'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setAuctionForm((prev) => ({
                        ...prev,
                        auctionCalculationMode: 'DISCOUNT_BASED',
                      }))
                    }
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      auctionForm.auctionCalculationMode === 'DISCOUNT_BASED'
                        ? 'border-teal-700 bg-teal-50/70 text-teal-900 ring-1 ring-teal-700'
                        : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <TrendingDown size={14} className="text-teal-700" />
                      <span>Discount-Based Auction</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Winning bid discount is recorded. Member dividends and approved commission are computed.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setAuctionForm((prev) => ({
                        ...prev,
                        auctionCalculationMode: 'FIXED_PAYOUT',
                      }))
                    }
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      auctionForm.auctionCalculationMode === 'FIXED_PAYOUT'
                        ? 'border-indigo-700 bg-indigo-50/70 text-indigo-900 ring-1 ring-indigo-700'
                        : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <ShieldCheck size={14} className="text-indigo-700" />
                      <span>Fixed Payout / No Discount</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Fixed agreed winner payout. Discount is zero; no dividends generated.
                    </p>
                  </button>
                </div>
              </div>

              {/* Auction Period & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Auction Period (Month #) *
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
                    Auction Conducted Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={auctionForm.auctionDate}
                    onChange={(e) =>
                      setAuctionForm({ ...auctionForm, auctionDate: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Winning Member */}
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
                  <option value="">-- Choose Eligible Member Winning the Round --</option>
                  {groupDetails?.memberships
                    ?.filter((m: any) => !m.isPrized && m.status === 'ACTIVE')
                    .map((m: any) => (
                      <option key={m.id} value={m.id}>
                        Ticket #{m.ticketNumber} - {m.customer?.fullName} ({m.customer?.phone})
                      </option>
                    ))}
                </select>
                {groupDetails?.memberships && groupDetails.memberships.filter((m: any) => !m.isPrized && m.status === 'ACTIVE').length === 0 && (
                  <p className="text-[11px] text-amber-700 mt-1">
                    No active non-prized members remaining in this group.
                  </p>
                )}
              </div>

              {/* Mode-Specific Fields */}
              {auctionForm.auctionCalculationMode === 'DISCOUNT_BASED' ? (
                /* Discount-Based Form Section */
                <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-800">
                        Winning Bid Discount (₹) *
                      </label>
                      {selectedGroup?.minBidDiscount && (
                        <span className="text-[11px] text-slate-500">
                          Range: {formatINR(selectedGroup.minBidDiscount)} - {formatINR(selectedGroup.maxBidDiscount || selectedGroup.totalValue)}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      required
                      min={0}
                      max={selectedGroup?.totalValue ? Number(selectedGroup.totalValue) : undefined}
                      value={auctionForm.winningBidAmount}
                      onChange={(e) =>
                        setAuctionForm({
                          ...auctionForm,
                          winningBidAmount: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 text-xs border rounded-lg bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none tabular-nums font-bold"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Amount the member agreed to forego. The winner receives chit value minus this discount.
                    </p>
                  </div>

                  {/* Rules preview */}
                  <div className="text-xs bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                      <Info size={13} className="text-teal-700" />
                      Applicable Commission & Discount Distribution Rules:
                    </span>
                    <p className="text-slate-600 text-[11px]">
                      {preview?.commissionRuleSummary || 'Commission: Checked against group approved terms.'}
                    </p>
                    <p className="text-slate-600 text-[11px]">
                      {preview?.discountDistributionSummary || 'Dividend: Distributed equally among all tickets.'}
                    </p>
                  </div>
                </div>
              ) : (
                /* Fixed-Payout Form Section */
                <div className="space-y-3 p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Fixed Agreed Winner Payout (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={selectedGroup?.totalValue ? Number(selectedGroup.totalValue) : undefined}
                      value={auctionForm.fixedPayoutAmount}
                      onChange={(e) =>
                        setAuctionForm({
                          ...auctionForm,
                          fixedPayoutAmount: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 text-xs border rounded-lg bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none tabular-nums font-bold"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Configured scheme terms. Not assumed to equal chit value ({selectedGroup ? formatINR(selectedGroup.totalValue) : 'Total Value'}).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Separately Applicable, Explicitly Configured Adjustments (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={Number(auctionForm.fixedPayoutAmount || 0)}
                      value={auctionForm.adjustmentAmount}
                      onChange={(e) =>
                        setAuctionForm({
                          ...auctionForm,
                          adjustmentAmount: Number(e.target.value),
                        })
                      }
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs border rounded-lg bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none tabular-nums"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Only apply explicit agreed deductions (e.g. documentation or confirmed foreman fee). Never assumed.
                    </p>
                  </div>

                  <div className="text-[11px] bg-indigo-50 p-2.5 rounded-lg border border-indigo-200 text-indigo-900 flex items-start gap-1.5">
                    <Info size={14} className="shrink-0 mt-0.5 text-indigo-700" />
                    <span>
                      Fixed-payout mode: Auction discount is strictly zero. No member dividends are generated, and monthly installment dues remain unchanged.
                    </span>
                  </div>
                </div>
              )}

              {/* Calculated Payout Preview Card */}
              {preview && (
                <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2.5 shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-teal-400" />
                      Calculated Payout & Ledger Preview
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {preview.auctionCalculationMode}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Group Chit Value</span>
                      <span className="font-bold tabular-nums text-slate-200">
                        {formatINR(preview.totalValue)}
                      </span>
                    </div>

                    {preview.auctionCalculationMode === 'DISCOUNT_BASED' ? (
                      <>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Winning Bid Discount</span>
                          <span className="font-bold text-amber-400 tabular-nums">
                            {formatINR(preview.winningBidAmount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Foreman Commission</span>
                          <span className="font-bold text-slate-200 tabular-nums">
                            {formatINR(preview.foremanCommission)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Total Member Dividends</span>
                          <span className="font-bold text-teal-400 tabular-nums">
                            {formatINR(preview.dividendTotal)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Dividend / Member</span>
                          <span className="font-bold text-teal-400 tabular-nums">
                            {formatINRDecimals(preview.dividendPerMember)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Next Installment Due</span>
                          <span className="font-bold text-slate-200 tabular-nums">
                            {formatINR(preview.nextInstallmentPayable)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Fixed Agreed Payout</span>
                          <span className="font-bold text-indigo-300 tabular-nums">
                            {formatINR(preview.fixedPayoutAmount || preview.netPrizeAmount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Separately Adjusted</span>
                          <span className="font-bold text-slate-300 tabular-nums">
                            {formatINR(preview.adjustmentAmount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Member Dividend</span>
                          <span className="font-bold text-slate-400">
                            ₹0 (No Discount)
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Installment Due</span>
                          <span className="font-bold text-slate-200 tabular-nums">
                            {formatINR(preview.nextInstallmentPayable)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-semibold">
                      Final Net Prize Payout Preview:
                    </span>
                    <span className="text-base font-black text-teal-400 tabular-nums">
                      {formatINR(preview.netPrizeAmount)}
                    </span>
                  </div>

                  {preview.isDuplicate && (
                    <div className="p-2 rounded bg-red-900/80 border border-red-700 text-xs text-red-200 flex items-center gap-1.5">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>An auction for Month {preview.monthNumber} is already recorded for this group.</span>
                    </div>
                  )}

                  {preview.winnerError && (
                    <div className="p-2 rounded bg-amber-900/80 border border-amber-700 text-xs text-amber-200 flex items-center gap-1.5">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{preview.winnerError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Auction Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Auction Notes / Attendees
                </label>
                <input
                  type="text"
                  value={auctionForm.notes}
                  onChange={(e) => setAuctionForm({ ...auctionForm, notes: e.target.value })}
                  placeholder="e.g. Conducted at 11 AM with 14 members present"
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              {/* Financial safeguard explanation */}
              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-start gap-1.5">
                <ShieldCheck size={14} className="shrink-0 text-teal-700 mt-0.5" />
                <span>
                  Recording an auction atomically updates the installment ledger, prized ticket status, and audit log.
                  Recording the actual payout voucher remains an explicit separate action in the Payouts module.
                </span>
              </div>

              {/* Modal Buttons */}
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
                  disabled={
                    recordAuctionMutation.isPending ||
                    !auctionForm.chitGroupId ||
                    !auctionForm.winningMembershipId ||
                    Boolean(preview?.isDuplicate) ||
                    Boolean(preview?.winnerError)
                  }
                  className="px-4 py-2 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {recordAuctionMutation.isPending && (
                    <Loader2 size={14} className="animate-spin" />
                  )}
                  <span>Apply Auction Result</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
