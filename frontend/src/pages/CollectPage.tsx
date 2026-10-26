import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Receipt,
} from 'lucide-react';
import { collectionsApi } from '../api/collections';
import type { PendingInstallment } from '../api/collections';
import { customersApi } from '../api/customers';
import { TopHeader } from '../components/layout/TopHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatINR, formatDate, formatPhone } from '../utils/formatters';

interface AllocationState {
  [installmentId: string]: {
    selected: boolean;
    allocatedAmount: number;
    membershipId: string;
  };
}

export const CollectPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const preselectedCustomerId = searchParams.get('customerId') || '';
  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId);

  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);

  // Allocations mapping: installmentId -> { selected, allocatedAmount, membershipId }
  const [allocations, setAllocations] = useState<AllocationState>({});

  // 1. Fetch customer list for customer selection
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getAll(),
  });

  // 2. Fetch dues when customer is selected
  const {
    data: duesData,
    isLoading: isDuesLoading,
  } = useQuery({
    queryKey: ['customerDues', selectedCustomerId],
    queryFn: () => collectionsApi.getCustomerDues(selectedCustomerId),
    enabled: !!selectedCustomerId,
  });

  // Initialize allocations whenever pending installments load
  useEffect(() => {
    if (duesData && duesData.pendingInstallments) {
      const initial: AllocationState = {};
      duesData.pendingInstallments.forEach((inst, idx) => {
        // Select earliest due installment by default
        initial[inst.installmentId] = {
          selected: idx === 0,
          allocatedAmount: inst.dueAmount,
          membershipId: inst.membershipId,
        };
      });
      setAllocations(initial);
    } else {
      setAllocations({});
    }
  }, [duesData]);

  // Compute total collection amount as the sum of all selected allocations
  const totalAmount = Object.entries(allocations).reduce((sum, [_, val]) => {
    return val.selected ? sum + Number(val.allocatedAmount || 0) : sum;
  }, 0);

  const handleToggleInstallment = (inst: PendingInstallment) => {
    setAllocations((prev) => {
      const current = prev[inst.installmentId] || {
        selected: false,
        allocatedAmount: inst.dueAmount,
        membershipId: inst.membershipId,
      };
      return {
        ...prev,
        [inst.installmentId]: {
          ...current,
          selected: !current.selected,
          allocatedAmount: !current.selected ? inst.dueAmount : current.allocatedAmount,
        },
      };
    });
  };

  const handleAmountChange = (installmentId: string, amount: number) => {
    setAllocations((prev) => ({
      ...prev,
      [installmentId]: {
        ...prev[installmentId],
        allocatedAmount: amount,
      },
    }));
  };

  // Submit collection mutation
  const collectMutation = useMutation({
    mutationFn: async () => {
      const activeAllocations = Object.entries(allocations)
        .filter(([_, val]) => val.selected && val.allocatedAmount > 0)
        .map(([installmentId, val]) => ({
          installmentId,
          membershipId: val.membershipId,
          allocatedAmount: Number(val.allocatedAmount),
        }));

      if (activeAllocations.length === 0) {
        throw new Error('Please select at least one installment to allocate payment towards');
      }

      return collectionsApi.record({
        customerId: selectedCustomerId,
        amount: totalAmount,
        paymentMode,
        paymentDate: new Date(paymentDate).toISOString(),
        transactionRef: transactionRef.trim() || undefined,
        notes: notes.trim() || undefined,
        allocations: activeAllocations,
      });
    },
    onSuccess: (receipt) => {
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', selectedCustomerId] });
      queryClient.invalidateQueries({ queryKey: ['customerDues', selectedCustomerId] });
      navigate(`/receipts/${receipt.id}`);
    },
    onError: (err: any) => {
      setServerError(err.message || 'Failed to record manual collection');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!selectedCustomerId) {
      setServerError('Please choose a customer');
      return;
    }
    if (totalAmount <= 0) {
      setServerError('Total collection amount must be greater than zero');
      return;
    }
    collectMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <TopHeader
        title="Record Collection"
        subtitle="Manual Cash, UPI & Bank Receipts"
      />

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {serverError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
            <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Customer Selection */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              1. Select Customer
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white font-medium"
            >
              <option value="">-- Choose Customer from Directory --</option>
              {customers?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.customerCode} • {formatPhone(c.phone)})
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Dues & Multi-installment Allocation Breakdown */}
          {selectedCustomerId && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    2. Installment Allocations
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Supports one payment covering multiple installments and partial installments
                  </p>
                </div>
                {duesData && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Total Due: {formatINR(duesData.totalDueAmount)}
                  </span>
                )}
              </div>

              {isDuesLoading ? (
                <LoadingSpinner message="Loading outstanding installments..." className="py-6" />
              ) : duesData && duesData.pendingInstallments.length > 0 ? (
                <div className="space-y-2.5">
                  {duesData.pendingInstallments.map((inst) => {
                    const alloc = allocations[inst.installmentId] || {
                      selected: false,
                      allocatedAmount: inst.dueAmount,
                    };

                    return (
                      <div
                        key={inst.installmentId}
                        className={`p-3 rounded-xl border transition-all ${
                          alloc.selected
                            ? 'bg-teal-50/50 border-teal-300 shadow-xs'
                            : 'bg-slate-50 border-slate-200 opacity-80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-start gap-2.5 cursor-pointer flex-1 select-none">
                            <input
                              type="checkbox"
                              checked={alloc.selected}
                              onChange={() => handleToggleInstallment(inst)}
                              className="mt-1 w-4 h-4 rounded text-teal-700 focus:ring-teal-600 border-slate-300"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-900">
                                {inst.groupName}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Ticket #{inst.ticketNumber} • Month {inst.monthNumber} • Due {formatDate(inst.dueDate)}
                              </div>
                              <div className="text-[11px] text-slate-600 mt-1">
                                Net Payable: {formatINR(inst.payableAmount)}
                                {inst.paidAlready > 0 && ` (Paid: ${formatINR(inst.paidAlready)})`}
                              </div>
                            </div>
                          </label>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-slate-500 block">Due</span>
                            <span className="text-xs font-bold text-slate-900 tabular-nums">
                              {formatINR(inst.dueAmount)}
                            </span>
                          </div>
                        </div>

                        {alloc.selected && (
                          <div className="mt-2 pt-2 border-t border-teal-200/60 flex items-center justify-between gap-3">
                            <span className="text-[11px] font-semibold text-teal-900">
                              Collect towards this installment:
                            </span>
                            <div className="relative w-32">
                              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs font-bold text-slate-500 pointer-events-none">
                                ₹
                              </span>
                              <input
                                type="number"
                                min={1}
                                max={inst.dueAmount}
                                value={alloc.allocatedAmount}
                                onChange={(e) =>
                                  handleAmountChange(inst.installmentId, Number(e.target.value))
                                }
                                className="w-full pl-6 pr-2 py-1.5 text-xs font-bold text-right bg-white border border-teal-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 tabular-nums"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg">
                  <CheckCircle size={20} className="mx-auto text-teal-600 mb-1" />
                  <p className="font-semibold text-slate-800">No Pending Dues!</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    This customer has paid all installments for active months up to date.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Payment Mode, Reference & Totals */}
          {selectedCustomerId && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                3. Collection Payment Details
              </h3>

              {/* Payment Mode Pills */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mode of Collection *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'] as const).map((mode) => (
                    <button
                      type="button"
                      key={mode}
                      onClick={() => setPaymentMode(mode)}
                      className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all border touch-target ${
                        paymentMode === mode
                          ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {mode === 'BANK_TRANSFER' ? 'BANK TRANSFER' : mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date Received *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {paymentMode === 'UPI'
                      ? 'UPI UTR / Reference No.'
                      : paymentMode === 'BANK_TRANSFER'
                      ? 'NEFT / IMPS Reference'
                      : paymentMode === 'CHEQUE'
                      ? 'Cheque No. & Bank'
                      : 'Cash Receipt Reference (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. UPI-UTR-293810291"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Collection Note (Notebook Remarks)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Collected at customer shop by Durga"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              {/* Total Summary Callout */}
              <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-teal-800 font-medium block">
                    Total Amount Received
                  </span>
                  <span className="text-xs text-teal-600">
                    Mode: <strong className="uppercase">{paymentMode}</strong>
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-teal-900 tabular-nums">
                  {formatINR(totalAmount)}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={collectMutation.isPending || totalAmount <= 0}
                  className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-teal-700 text-white font-bold text-sm hover:bg-teal-800 active:scale-[0.99] transition-all disabled:opacity-50 touch-target shadow-md shadow-teal-700/20"
                >
                  {collectMutation.isPending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Recording Payment in Ledger...</span>
                    </>
                  ) : (
                    <>
                      <Receipt size={18} />
                      <span>Confirm & Issue Receipt ({formatINR(totalAmount)})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
