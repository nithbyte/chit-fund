import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  Plus,
  BadgePercent,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { payoutsApi } from '../api/payouts';
import type { RecordPayoutPayload } from '../api/payouts';
import { chitGroupsApi } from '../api/chit-groups';
import { auctionsApi } from '../api/auctions';
import { TopHeader } from '../components/layout/TopHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatINR, formatDate, formatPhone } from '../utils/formatters';

export const PayoutsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [payoutForm, setPayoutForm] = useState<RecordPayoutPayload>({
    chitGroupId: '',
    membershipId: '',
    auctionId: '',
    grossPrizeAmount: 100000,
    deductionAmount: 0,
    netPaidAmount: 100000,
    paymentMode: 'BANK_TRANSFER',
    transactionRef: '',
    guarantorName1: '',
    guarantorPhone1: '',
    guarantorName2: '',
    guarantorPhone2: '',
    notes: '',
  });

  // 1. Fetch real payouts from backend
  const { data: payouts, isLoading, error } = useQuery({
    queryKey: ['payouts'],
    queryFn: () => payoutsApi.getAll(),
  });

  // 2. Fetch chit groups for dropdown
  const { data: groups } = useQuery({
    queryKey: ['chitGroups'],
    queryFn: chitGroupsApi.getAll,
  });

  // 3. Fetch auctions for selected group
  const { data: auctions } = useQuery({
    queryKey: ['auctions', payoutForm.chitGroupId],
    queryFn: () => auctionsApi.getAll(payoutForm.chitGroupId),
    enabled: !!payoutForm.chitGroupId,
  });

  // 4. Fetch group details to get members
  const { data: groupDetails } = useQuery({
    queryKey: ['chitGroup', payoutForm.chitGroupId],
    queryFn: () => chitGroupsApi.getById(payoutForm.chitGroupId),
    enabled: !!payoutForm.chitGroupId,
  });

  const recordPayoutMutation = useMutation({
    mutationFn: (data: RecordPayoutPayload) => payoutsApi.record(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      queryClient.invalidateQueries({ queryKey: ['chitGroups'] });
      queryClient.invalidateQueries({ queryKey: ['chitGroup', payoutForm.chitGroupId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setIsModalOpen(false);
      setPayoutForm({
        chitGroupId: '',
        membershipId: '',
        auctionId: '',
        grossPrizeAmount: 100000,
        deductionAmount: 0,
        netPaidAmount: 100000,
        paymentMode: 'BANK_TRANSFER',
        transactionRef: '',
        guarantorName1: '',
        guarantorPhone1: '',
        guarantorName2: '',
        guarantorPhone2: '',
        notes: '',
      });
    },
    onError: (err: any) => {
      setModalError(err.message || 'Failed to record payout voucher');
    },
  });

  const handleGroupChange = (groupId: string) => {
    const selected = groups?.find((g) => g.id === groupId);
    const grossVal = selected ? Number(selected.totalValue) : 100000;
    setPayoutForm((prev) => ({
      ...prev,
      chitGroupId: groupId,
      membershipId: '',
      auctionId: '',
      grossPrizeAmount: grossVal,
      netPaidAmount: grossVal,
    }));
  };

  const handleAuctionChange = (auctionId: string) => {
    const selAuction = auctions?.find((a) => a.id === auctionId);
    if (selAuction) {
      const net = Number(selAuction.netPrizeAmount);
      const gross = payoutForm.grossPrizeAmount;
      const deduction = Math.max(0, gross - net);
      setPayoutForm((prev) => ({
        ...prev,
        auctionId,
        membershipId: selAuction.winningMembershipId || prev.membershipId,
        deductionAmount: deduction,
        netPaidAmount: net,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!payoutForm.chitGroupId || !payoutForm.membershipId || !payoutForm.auctionId) {
      setModalError('Please select Chit Group, Winning Auction and Member');
      return;
    }
    recordPayoutMutation.mutate(payoutForm);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <TopHeader
        title="Payout Records"
        subtitle="Prize Money Disbursements & Guarantor Ledgers"
        rightAction={
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors shadow-xs touch-target"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Disburse Payout</span>
            <span className="sm:hidden">Disburse</span>
          </button>
        }
      />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {isLoading ? (
          <LoadingSpinner message="Loading verified prize disbursements..." />
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
            Failed to load payout records.
          </div>
        ) : payouts && payouts.length > 0 ? (
          <div className="space-y-3">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1">
              Showing {payouts.length} disbursed prize vouchers
            </div>

            {payouts.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {p.voucherNumber}
                      </span>
                      <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                        {p.status}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">{p.groupName}</h3>
                  </div>

                  <div className="text-right">
                    <div className="text-base sm:text-xl font-black text-slate-950 tabular-nums">
                      {formatINR(p.netPaidAmount)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Gross: {formatINR(p.grossPrizeAmount)}
                      {p.deductionAmount > 0 && ` (Bid Discount: -${formatINR(p.deductionAmount)})`}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-3 border-b border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Prized Member</span>
                    <span className="font-bold text-slate-900">{p.winnerName}</span>
                    <span className="text-[10px] text-slate-500 block">
                      Ticket #{p.ticketNumber} • {formatPhone(p.winnerPhone)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Auction Month</span>
                    <span className="font-bold text-slate-900">Month {p.auctionMonth}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Disbursement Date</span>
                    <span className="font-bold text-slate-900">{formatDate(p.payoutDate)}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Payment Mode</span>
                    <span className="font-bold text-teal-800 uppercase px-1.5 py-0.2 rounded bg-teal-50 border border-teal-200 inline-block">
                      {p.paymentMode}
                    </span>
                    {p.transactionRef && (
                      <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                        Ref: {p.transactionRef}
                      </span>
                    )}
                  </div>
                </div>

                {/* Guarantor Records */}
                {(p.guarantor1 || p.guarantor2) && (
                  <div className="pt-2.5 text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                      <ShieldCheck size={14} className="text-teal-600" />
                      <span>Verified Guarantor Records:</span>
                    </div>
                    <div className="text-[11px] text-slate-600 pl-5 space-y-0.5">
                      {p.guarantor1 && <div>1. {p.guarantor1}</div>}
                      {p.guarantor2 && <div>2. {p.guarantor2}</div>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
            <BadgePercent size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-600 font-medium">No payout vouchers recorded yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Once an auction is held, click "Disburse Payout" to record prize money release.
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors"
            >
              <Plus size={15} />
              <span>Disburse First Payout</span>
            </button>
          </div>
        )}
      </div>

      {/* Disburse Payout Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-teal-800">
                <BadgePercent size={20} />
                <h3 className="text-base font-bold text-slate-900">Record Prize Payout Voucher</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                <AlertCircle size={15} className="text-red-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Select Chit Group *
                </label>
                <select
                  required
                  value={payoutForm.chitGroupId}
                  onChange={(e) => handleGroupChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 font-medium"
                >
                  <option value="">-- Choose Chit Group --</option>
                  {groups?.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.groupCode} • Value: {formatINR(g.totalValue)})
                    </option>
                  ))}
                </select>
              </div>

              {payoutForm.chitGroupId && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        2. Winning Auction *
                      </label>
                      <select
                        required
                        value={payoutForm.auctionId}
                        onChange={(e) => handleAuctionChange(e.target.value)}
                        className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 font-medium"
                      >
                        <option value="">-- Choose Auction --</option>
                        {auctions?.map((a) => (
                          <option key={a.id} value={a.id}>
                            Month {a.monthNumber} (Net: {formatINR(a.netPrizeAmount)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        3. Prized Member *
                      </label>
                      <select
                        required
                        value={payoutForm.membershipId}
                        onChange={(e) => setPayoutForm({ ...payoutForm, membershipId: e.target.value })}
                        className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 font-medium"
                      >
                        <option value="">-- Choose Winning Ticket --</option>
                        {groupDetails?.memberships?.map((m: any) => (
                          <option key={m.id} value={m.id}>
                            Ticket #{m.ticketNumber} - {m.customer.fullName} ({m.customer.customerCode})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Gross Chit Value (₹)
                      </label>
                      <input
                        type="number"
                        value={payoutForm.grossPrizeAmount}
                        onChange={(e) =>
                          setPayoutForm({ ...payoutForm, grossPrizeAmount: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Net Payout Disbursed (₹) *
                      </label>
                      <input
                        type="number"
                        required
                        value={payoutForm.netPaidAmount}
                        onChange={(e) =>
                          setPayoutForm({ ...payoutForm, netPaidAmount: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 text-xs border rounded-xl bg-teal-50 border-teal-300 font-black text-teal-950"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Disbursement Mode
                      </label>
                      <select
                        value={payoutForm.paymentMode}
                        onChange={(e) =>
                          setPayoutForm({ ...payoutForm, paymentMode: e.target.value as any })
                        }
                        className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 font-semibold"
                      >
                        <option value="BANK_TRANSFER">Bank Transfer (IMPS/NEFT)</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI Transfer</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Bank UTR / Cheque Ref
                      </label>
                      <input
                        type="text"
                        value={payoutForm.transactionRef || ''}
                        onChange={(e) =>
                          setPayoutForm({ ...payoutForm, transactionRef: e.target.value })
                        }
                        placeholder="e.g. UTR-HDFC-991203"
                        className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 font-mono"
                      />
                    </div>
                  </div>

                  {/* Guarantor Tracking */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Guarantor Verification (Required for Chits)
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={payoutForm.guarantorName1 || ''}
                        onChange={(e) =>
                          setPayoutForm({ ...payoutForm, guarantorName1: e.target.value })
                        }
                        placeholder="Guarantor 1 Name"
                        className="px-2.5 py-1.5 text-xs border rounded-lg bg-white"
                      />
                      <input
                        type="tel"
                        value={payoutForm.guarantorPhone1 || ''}
                        onChange={(e) =>
                          setPayoutForm({ ...payoutForm, guarantorPhone1: e.target.value })
                        }
                        placeholder="Guarantor 1 Phone"
                        className="px-2.5 py-1.5 text-xs border rounded-lg bg-white font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={payoutForm.guarantorName2 || ''}
                        onChange={(e) =>
                          setPayoutForm({ ...payoutForm, guarantorName2: e.target.value })
                        }
                        placeholder="Guarantor 2 Name"
                        className="px-2.5 py-1.5 text-xs border rounded-lg bg-white"
                      />
                      <input
                        type="tel"
                        value={payoutForm.guarantorPhone2 || ''}
                        onChange={(e) =>
                          setPayoutForm({ ...payoutForm, guarantorPhone2: e.target.value })
                        }
                        placeholder="Guarantor 2 Phone"
                        className="px-2.5 py-1.5 text-xs border rounded-lg bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Notes / Security Pledges
                    </label>
                    <input
                      type="text"
                      value={payoutForm.notes || ''}
                      onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })}
                      placeholder="e.g. Promissory note signed; 2 blank cheques pledged"
                      className="w-full px-3 py-1.5 text-xs border rounded-xl bg-slate-50"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordPayoutMutation.isPending || !payoutForm.membershipId}
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  {recordPayoutMutation.isPending && (
                    <Loader2 size={15} className="animate-spin text-white" />
                  )}
                  <span>Confirm & Disburse Payout</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
