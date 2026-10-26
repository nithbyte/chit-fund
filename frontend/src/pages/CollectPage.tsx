import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  ChevronRight,
  Sparkles,
  Banknote,
  Smartphone,
  Building,
  RotateCcw,
} from 'lucide-react';
import { collectionsApi } from '../api/collections';
import type { PendingInstallment } from '../api/collections';
import { customersApi } from '../api/customers';
import type { Customer } from '../api/customers';
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

  // Search & Selection State
  const preselectedCustomerId = searchParams.get('customerId') || '';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedMembershipId, setSelectedMembershipId] = useState<string>('ALL');

  // Payment Details State
  const [amountInput, setAmountInput] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER'>('CASH');
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    const now = new Date();
    // Local ISO string YYYY-MM-DDTHH:mm
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  });
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [serverError, setServerError] = useState<string | null>(null);

  // Client-generated idempotency key
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());

  // Allocations mapping: installmentId -> { selected, allocatedAmount, membershipId }
  const [allocations, setAllocations] = useState<AllocationState>({});

  // 1. Fetch customer list for instant search
  const { data: customerData, isLoading: isCustomersLoading } = useQuery({
    queryKey: ['customersDirectory', searchQuery],
    queryFn: () => customersApi.getAll({ search: searchQuery, limit: 30 }),
  });

  // Pre-load customer if preselectedCustomerId is present
  useEffect(() => {
    if (preselectedCustomerId) {
      customersApi.getById(preselectedCustomerId).then((cust) => {
        if (cust) setSelectedCustomer(cust);
      }).catch(() => {});
    }
  }, [preselectedCustomerId]);

  // 2. Fetch customer dues when customer is selected
  const {
    data: duesData,
    isLoading: isDuesLoading,
  } = useQuery({
    queryKey: ['customerDues', selectedCustomer?.id, selectedMembershipId],
    queryFn: () =>
      collectionsApi.getCustomerDues(
        selectedCustomer!.id,
        selectedMembershipId === 'ALL' ? undefined : selectedMembershipId,
      ),
    enabled: !!selectedCustomer?.id,
  });

  // Filtered pending installments based on selected membership
  const displayedInstallments = useMemo(() => {
    if (!duesData?.pendingInstallments) return [];
    if (selectedMembershipId === 'ALL') return duesData.pendingInstallments;
    return duesData.pendingInstallments.filter((i) => i.membershipId === selectedMembershipId);
  }, [duesData, selectedMembershipId]);

  // Total allocated calculation
  const totalAllocated = useMemo(() => {
    return Object.entries(allocations).reduce((sum, [, val]) => {
      return val.selected ? sum + Number(val.allocatedAmount || 0) : sum;
    }, 0);
  }, [allocations]);

  const numericEnteredAmount = Number(amountInput) || 0;
  const allocationDifference = numericEnteredAmount - totalAllocated;

  // Auto-allocate helper: cascades entered amount sequentially across earliest due installments
  const handleAutoAllocate = (amountToDistribute?: number) => {
    const targetAmount = amountToDistribute !== undefined ? amountToDistribute : numericEnteredAmount;
    if (targetAmount <= 0 || displayedInstallments.length === 0) return;

    let remainingToAllocate = targetAmount;
    const newAllocations: AllocationState = {};

    for (const inst of displayedInstallments) {
      if (remainingToAllocate <= 0) {
        newAllocations[inst.installmentId] = {
          selected: false,
          allocatedAmount: 0,
          membershipId: inst.membershipId,
        };
      } else if (remainingToAllocate >= inst.dueAmount) {
        newAllocations[inst.installmentId] = {
          selected: true,
          allocatedAmount: inst.dueAmount,
          membershipId: inst.membershipId,
        };
        remainingToAllocate -= inst.dueAmount;
      } else {
        // Partial allocation for the remaining amount
        newAllocations[inst.installmentId] = {
          selected: true,
          allocatedAmount: Number(remainingToAllocate.toFixed(2)),
          membershipId: inst.membershipId,
        };
        remainingToAllocate = 0;
      }
    }

    setAllocations(newAllocations);
  };

  // When amountInput changes, if allocations were untouched or user wants auto-sync
  const handleAmountInputChange = (val: string) => {
    setAmountInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      handleAutoAllocate(num);
    }
  };

  // Quick preset buttons (e.g. Full Due, 1 Month installment)
  const setQuickAmount = (amt: number) => {
    const rounded = Math.round(amt);
    setAmountInput(String(rounded));
    handleAutoAllocate(rounded);
  };

  // Toggle single installment manually
  const handleToggleInstallment = (inst: PendingInstallment) => {
    setAllocations((prev) => {
      const current = prev[inst.installmentId] || {
        selected: false,
        allocatedAmount: inst.dueAmount,
        membershipId: inst.membershipId,
      };
      const nextSelected = !current.selected;
      return {
        ...prev,
        [inst.installmentId]: {
          ...current,
          selected: nextSelected,
          allocatedAmount: nextSelected ? inst.dueAmount : 0,
        },
      };
    });
  };

  // Adjust manual allocated amount
  const handleManualAllocationChange = (installmentId: string, val: string) => {
    const amt = parseFloat(val) || 0;
    setAllocations((prev) => ({
      ...prev,
      [installmentId]: {
        ...prev[installmentId],
        allocatedAmount: amt,
        selected: amt > 0,
      },
    }));
  };

  // Submit collection mutation
  const collectMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer) throw new Error('Please select a customer');

      const activeAllocations = Object.entries(allocations)
        .filter(([, val]) => val.selected && val.allocatedAmount > 0)
        .map(([installmentId, val]) => ({
          installmentId,
          membershipId: val.membershipId,
          allocatedAmount: Number(val.allocatedAmount),
        }));

      if (activeAllocations.length === 0) {
        throw new Error('Please allocate payment towards at least one installment');
      }

      const totalAlloc = activeAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
      if (Math.abs(totalAlloc - numericEnteredAmount) > 0.01) {
        throw new Error(
          `Total allocated (₹${totalAlloc.toFixed(2)}) must exactly match entered amount (₹${numericEnteredAmount.toFixed(2)})`,
        );
      }

      return collectionsApi.record({
        customerId: selectedCustomer.id,
        amount: numericEnteredAmount,
        paymentMode,
        paymentDate: new Date(paymentDate).toISOString(),
        transactionRef: transactionRef.trim() || undefined,
        notes: notes.trim() || undefined,
        idempotencyKey,
        allocations: activeAllocations,
      });
    },
    onSuccess: (receipt) => {
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', selectedCustomer?.id] });
      queryClient.invalidateQueries({ queryKey: ['customerDues', selectedCustomer?.id] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      navigate(`/receipts/${receipt.id}`);
    },
    onError: (err: any) => {
      // Regenerate idempotency key on failure to allow retry
      setIdempotencyKey(crypto.randomUUID());
      setServerError(err.message || 'Failed to record collection. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!selectedCustomer) {
      setServerError('Please select a customer to collect payment from');
      return;
    }
    if (numericEnteredAmount <= 0) {
      setServerError('Please enter a valid payment amount greater than zero');
      return;
    }
    if (Math.abs(allocationDifference) > 0.01) {
      setServerError(
        allocationDifference > 0
          ? `You have ₹${allocationDifference.toFixed(2)} unallocated. Tap "Auto-Allocate" or adjust amounts.`
          : `Allocations exceed entered amount by ₹${Math.abs(allocationDifference).toFixed(2)}. Adjust amounts.`,
      );
      return;
    }

    collectMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-36">
      <TopHeader
        title="Fast Mobile Collection"
        subtitle="One-handed Daily Receipt Entry"
        showBack
        backPath="/dashboard"
      />

      <div className="max-w-xl mx-auto px-4 py-3 space-y-4">
        {serverError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5 shadow-xs">
            <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
            <span className="font-medium leading-relaxed">{serverError}</span>
          </div>
        )}

        {/* STEP 1: Fast Customer Search Bar */}
        {!selectedCustomer ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Search size={14} className="text-teal-700" />
                <span>Step 1: Search Customer</span>
              </label>
              <span className="text-[11px] text-slate-400">Name, Phone or Code</span>
            </div>

            <div className="relative">
              <input
                type="search"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type customer name, phone or code (e.g. Ramesh, 9848...)"
                className="w-full pl-3.5 pr-10 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <RotateCcw size={15} />
                </button>
              )}
            </div>

            {/* Instant Search Results */}
            <div className="space-y-1.5 max-h-72 overflow-y-auto divide-y divide-slate-100">
              {isCustomersLoading ? (
                <LoadingSpinner message="Searching customer records..." className="py-6" />
              ) : customerData?.items && customerData.items.length > 0 ? (
                customerData.items.map((cust) => (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(cust);
                      setSearchQuery('');
                      setServerError(null);
                    }}
                    className="w-full text-left p-3 rounded-xl hover:bg-teal-50/60 active:bg-teal-100 flex items-center justify-between transition-colors touch-target"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {cust.fullName}
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {cust.customerCode}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>{formatPhone(cust.phone)}</span>
                        <span>•</span>
                        <span>{cust.address || 'Guntur'}</span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-400 shrink-0" />
                  </button>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-400">
                  {searchQuery ? 'No matching customer found' : 'Start typing to search customer directory'}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Selected Customer Header Banner with Change Button */
          <div className="bg-teal-800 text-white rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-200">
                  Step 2: Customer Selected
                </span>
                <h2 className="text-lg font-black tracking-tight">{selectedCustomer.fullName}</h2>
                <div className="text-xs text-teal-100 font-mono flex items-center gap-2 mt-0.5">
                  <span>{selectedCustomer.customerCode}</span>
                  <span>•</span>
                  <span>{formatPhone(selectedCustomer.phone)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setAllocations({});
                  setAmountInput('');
                  setSelectedMembershipId('ALL');
                }}
                className="px-2.5 py-1 rounded-lg bg-teal-900/80 hover:bg-teal-950 text-teal-200 text-xs font-semibold border border-teal-700 transition-colors"
              >
                Change
              </button>
            </div>

            {/* STEP 2: Explicit Membership Selection (if multiple) */}
            {duesData?.memberships && duesData.memberships.length > 1 && (
              <div className="pt-2 border-t border-teal-700/60">
                <span className="text-[11px] font-bold text-teal-200 block mb-1.5">
                  Select Chit Membership:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedMembershipId('ALL')}
                    className={`p-2 rounded-lg text-xs font-semibold text-left transition-all ${
                      selectedMembershipId === 'ALL'
                        ? 'bg-white text-teal-900 shadow-sm'
                        : 'bg-teal-700/50 text-teal-100 hover:bg-teal-700'
                    }`}
                  >
                    All Chits Combined
                  </button>
                  {duesData.memberships.map((mem: any) => {
                    const memId = mem.id || mem.membershipId;
                    const groupTitle = mem.chitGroup?.name || mem.groupName || 'Chit Group';
                    return (
                      <button
                        key={memId}
                        type="button"
                        onClick={() => setSelectedMembershipId(memId)}
                        className={`p-2 rounded-lg text-xs font-semibold text-left transition-all ${
                          selectedMembershipId === memId
                            ? 'bg-white text-teal-900 shadow-sm'
                            : 'bg-teal-700/50 text-teal-100 hover:bg-teal-700'
                        }`}
                      >
                        <div className="truncate">{groupTitle}</div>
                        <div className="text-[10px] opacity-80 font-mono">
                          Ticket #{mem.ticketNumber}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Once Customer is selected, show steps 3 through 8 */}
        {selectedCustomer && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* STEP 3: Outstanding Dues & Recent Payment Snapshot */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Step 3: Dues & Ledger Snapshot
                </span>
                {isDuesLoading ? (
                  <span className="text-xs text-slate-400">Loading ledger...</span>
                ) : (
                  <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Total Due: {formatINR(duesData?.totalDueAmount || 0)}
                  </span>
                )}
              </div>

              {/* Recent Payment Card */}
              {duesData?.recentPayment ? (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Clock size={15} className="text-slate-400" />
                    <div>
                      <span className="font-semibold text-slate-800">Last Payment Received:</span>
                      <span className="text-slate-500 ml-1">
                        {formatDate(duesData.recentPayment.paymentDate)} via {duesData.recentPayment.paymentMode}
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-emerald-800 font-mono">
                    +{formatINR(duesData.recentPayment.amount)}
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">No previous payment recorded for this customer.</p>
              )}
            </div>

            {/* STEP 4: Large Numeric Amount Input */}
            <div className="bg-white rounded-2xl border-2 border-teal-600/30 p-4 shadow-xs space-y-3">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Step 4: Amount Received (₹)
              </label>

              <div className="relative flex items-center">
                <span className="absolute left-4 text-3xl font-black text-teal-800">₹</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  autoFocus
                  value={amountInput}
                  onChange={(e) => handleAmountInputChange(e.target.value)}
                  placeholder="0"
                  className="w-full pl-12 pr-4 py-3.5 text-3xl font-black text-slate-950 bg-teal-50/40 border-2 border-teal-600 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/20 focus:bg-white tracking-tight tabular-nums"
                />
              </div>

              {/* Quick Amount Suggestion Buttons */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {duesData && duesData.totalDueAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => setQuickAmount(duesData.totalDueAmount)}
                    className="px-3 py-1.5 rounded-lg bg-teal-100/70 hover:bg-teal-100 text-teal-900 text-xs font-bold whitespace-nowrap transition-colors touch-target"
                  >
                    Full Due ({formatINR(duesData.totalDueAmount)})
                  </button>
                )}
                {displayedInstallments[0] && (
                  <button
                    type="button"
                    onClick={() => setQuickAmount(displayedInstallments[0].dueAmount)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold whitespace-nowrap transition-colors touch-target"
                  >
                    {displayedInstallments[0].isWeekly ? '1 Week' : '1 Month'} ({formatINR(displayedInstallments[0].dueAmount)})
                  </button>
                )}
                {[1000, 2000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setQuickAmount(amt)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium whitespace-nowrap transition-colors"
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* STEP 5: Payment Method Buttons */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Step 5: Payment Method
              </label>

              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'CASH', label: 'Cash', icon: Banknote },
                    { id: 'UPI', label: 'UPI App', icon: Smartphone },
                    { id: 'BANK_TRANSFER', label: 'Bank', icon: Building },
                  ] as const
                ).map((method) => {
                  const Icon = method.icon;
                  const isSelected = paymentMode === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMode(method.id)}
                      className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all touch-target ${
                        isSelected
                          ? 'bg-teal-700 border-teal-700 text-white font-bold shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon size={19} />
                      <span className="text-xs">{method.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 6: Date & Reference */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Step 6: Receipt Date & Payment Reference
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Receipt Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Reference / UTR / Cheque (Optional)
                  </label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. UPI Ref / Cheque # / IMPS UTR"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                * Note: Reference is recorded as provided by payer and is not independently bank-verified.
              </p>
            </div>

            {/* STEP 7: Installment Allocation Preview */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Step 7: Allocation Preview
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Allocated: {formatINR(totalAllocated)} of {formatINR(numericEnteredAmount)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAutoAllocate()}
                  className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold flex items-center gap-1"
                >
                  <Sparkles size={13} />
                  <span>Auto-Allocate</span>
                </button>
              </div>

              {/* Difference notification */}
              {numericEnteredAmount > 0 && Math.abs(allocationDifference) > 0.01 && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                    allocationDifference > 0
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  <span>
                    {allocationDifference > 0
                      ? `₹${allocationDifference.toFixed(2)} remaining unallocated`
                      : `Exceeds entered amount by ₹${Math.abs(allocationDifference).toFixed(2)}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAutoAllocate()}
                    className="underline text-[11px]"
                  >
                    Auto-Fit
                  </button>
                </div>
              )}

              {/* Installment breakdown rows */}
              {displayedInstallments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  No pending installments found for this customer.
                </p>
              ) : (
                <div className="space-y-2">
                  {displayedInstallments.map((inst) => {
                    const alloc = allocations[inst.installmentId] || {
                      selected: false,
                      allocatedAmount: 0,
                      membershipId: inst.membershipId,
                    };

                    const isChecked = alloc.selected;
                    const allocatedAmt = alloc.allocatedAmount;
                    const remainingAfterAlloc = Math.max(0, inst.dueAmount - allocatedAmt);

                    return (
                      <div
                        key={inst.installmentId}
                        className={`p-3 rounded-xl border transition-all ${
                          isChecked
                            ? 'bg-teal-50/50 border-teal-300 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 opacity-80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleInstallment(inst)}
                              className="mt-0.5 w-4 h-4 rounded text-teal-700 border-slate-300 focus:ring-teal-600"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate">
                                {inst.groupName} • {inst.periodLabel || (inst.isWeekly ? `Week ${inst.monthNumber}` : `Month ${inst.monthNumber}`)}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Ticket #{inst.ticketNumber} • Due: {formatDate(inst.dueDate)}
                                {inst.isOverdue && (
                                  <span className="ml-1 text-red-700 font-bold uppercase text-[9px] px-1 rounded bg-red-100">
                                    Overdue
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-semibold text-slate-700 mt-0.5">
                                Installment Due: {formatINR(inst.dueAmount)}
                              </div>
                            </div>
                          </label>

                          {/* Allocation input */}
                          <div className="w-28 text-right shrink-0">
                            <span className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                              Allocated
                            </span>
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-xs text-slate-500 font-bold">₹</span>
                              <input
                                type="number"
                                inputMode="decimal"
                                value={allocatedAmt || ''}
                                onChange={(e) =>
                                  handleManualAllocationChange(inst.installmentId, e.target.value)
                                }
                                placeholder="0"
                                className="w-full pl-5 pr-2 py-1 text-xs font-bold text-right bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
                              />
                            </div>
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              Bal: {formatINR(remainingAfterAlloc)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Optional notes */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes (e.g. Paid in front of shop)"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              />
            </div>

            {/* STEP 8: Prominent Fixed-Bottom "Save Collection" Button */}
            {/* Positioned above mobile bottom navigation (bottom-16 md:bottom-4) with high z-index */}
            <div className="fixed bottom-16 md:bottom-4 left-0 right-0 z-40 px-4 max-w-xl mx-auto">
              <div className="bg-white/95 backdrop-blur-md p-2.5 rounded-2xl border border-slate-300 shadow-xl flex items-center gap-3">
                <div className="flex-1 min-w-0 pl-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Total to Record</div>
                  <div className="text-xl font-black text-teal-900 tracking-tight">
                    {formatINR(numericEnteredAmount)}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    collectMutation.isPending ||
                    numericEnteredAmount <= 0 ||
                    Math.abs(allocationDifference) > 0.01
                  }
                  className="flex-1 py-3 px-5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-extrabold text-sm shadow-md transition-all touch-target flex items-center justify-center gap-2"
                >
                  {collectMutation.isPending ? (
                    <>
                      <Loader2 size={18} className="animate-spin text-white" />
                      <span>Saving Collection...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Save Collection</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
