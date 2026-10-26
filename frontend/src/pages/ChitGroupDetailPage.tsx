import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  X,
  AlertCircle,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  Settings,
  Percent,
} from 'lucide-react';
import { chitGroupsApi, type ActivateChitGroupPayload, type CommissionType } from '../api/chit-groups';
import { customersApi } from '../api/customers';
import { TopHeader } from '../components/layout/TopHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatINR, formatDate, formatPhone } from '../utils/formatters';
import { CommissionConfigSection } from '../components/chit-groups/CommissionConfigSection';

export const ChitGroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [activateError, setActivateError] = useState<string | null>(null);

  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [commissionError, setCommissionError] = useState<string | null>(null);
  const [commissionForm, setCommissionForm] = useState({
    commissionType: 'PERCENTAGE_OF_CHIT_VALUE' as CommissionType,
    commissionRate: 5.0 as number | undefined,
    commissionAmount: 0 as number | undefined,
    commissionCalculationBase: 'CHIT_VALUE',
    commissionNotes: '',
    isCommissionConfirmed: false,
  });

  const [enrollForm, setEnrollForm] = useState({
    customerId: '',
    ticketNumber: 1,
    nomineeName: '',
    nomineePhone: '',
    notes: '',
  });

  const [activateForm, setActivateForm] = useState<ActivateChitGroupPayload>({
    startDate: new Date().toISOString().split('T')[0],
    totalMonths: 20,
    foremanCommissionRate: 5.0,
    commissionType: 'PERCENTAGE_OF_CHIT_VALUE',
    commissionRate: 5.0,
    commissionAmount: 0,
    commissionCalculationBase: 'CHIT_VALUE',
    commissionNotes: '',
    isCommissionConfirmed: false,
    minBidDiscount: 10000,
    maxBidDiscount: 40000,
    payoutRuleNotes: '',
    confirmActivation: false,
  });

  const { data: group, isLoading, error } = useQuery({
    queryKey: ['chitGroup', id],
    queryFn: () => chitGroupsApi.getById(id!),
    enabled: !!id,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getAll({ limit: 100 }),
  });

  const enrollMutation = useMutation({
    mutationFn: (data: typeof enrollForm) => chitGroupsApi.enroll(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chitGroup', id] });
      queryClient.invalidateQueries({ queryKey: ['chitGroups'] });
      setIsEnrollModalOpen(false);
      setEnrollForm({
        customerId: '',
        ticketNumber: 1,
        nomineeName: '',
        nomineePhone: '',
        notes: '',
      });
    },
    onError: (err: any) => {
      setEnrollError(err.message || 'Failed to enroll member');
    },
  });

  const activateMutation = useMutation({
    mutationFn: (data: ActivateChitGroupPayload) => chitGroupsApi.activate(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chitGroup', id] });
      queryClient.invalidateQueries({ queryKey: ['chitGroups'] });
      setIsActivateModalOpen(false);
    },
    onError: (err: any) => {
      setActivateError(err.message || 'Failed to activate chit group');
    },
  });

  const updateCommissionMutation = useMutation({
    mutationFn: (data: typeof commissionForm) => chitGroupsApi.updateCommission(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chitGroup', id] });
      queryClient.invalidateQueries({ queryKey: ['chitGroups'] });
      setIsCommissionModalOpen(false);
    },
    onError: (err: any) => {
      setCommissionError(err.message || 'Failed to update commission settings');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopHeader title="Chit Group" showBack backPath="/chit-groups" />
        <LoadingSpinner message="Loading scheme ledger..." />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopHeader title="Chit Group" showBack backPath="/chit-groups" />
        <div className="max-w-md mx-auto p-4 mt-8 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
          Chit Group not found.
        </div>
      </div>
    );
  }

  const isWeekly = group.isWeekly || (group.auctionFrequency || '').toUpperCase() === 'WEEKLY';
  const periodLabel = isWeekly ? 'Week' : 'Month';
  const isPlanned = group.status === 'PLANNED';

  const enrolledTickets = group.memberships?.map((m: any) => m.ticketNumber) || [];
  const nextAvailableTicket = Array.from({ length: group.totalMonths }, (_, i) => i + 1).find(
    (t) => !enrolledTickets.includes(t),
  );

  const openCommissionModal = () => {
    setCommissionForm({
      commissionType: group.commissionType || 'PERCENTAGE_OF_CHIT_VALUE',
      commissionRate: group.commissionRate ?? group.foremanCommissionRate ?? 5.0,
      commissionAmount: group.commissionAmount ? Number(group.commissionAmount) : 0,
      commissionCalculationBase: group.commissionCalculationBase || 'CHIT_VALUE',
      commissionNotes: group.commissionNotes || '',
      isCommissionConfirmed: Boolean(group.isCommissionConfirmed),
    });
    setCommissionError(null);
    setIsCommissionModalOpen(true);
  };

  const openActivationModal = () => {
    setActivateForm({
      startDate: group.startDate.split('T')[0],
      totalMonths: group.totalMonths,
      foremanCommissionRate: group.foremanCommissionRate ?? 5.0,
      commissionType: group.commissionType || 'PERCENTAGE_OF_CHIT_VALUE',
      commissionRate: group.commissionRate ?? group.foremanCommissionRate ?? 5.0,
      commissionAmount: group.commissionAmount ? Number(group.commissionAmount) : 0,
      commissionCalculationBase: group.commissionCalculationBase || 'CHIT_VALUE',
      commissionNotes: group.commissionNotes || '',
      isCommissionConfirmed: Boolean(group.isCommissionConfirmed),
      minBidDiscount: group.minBidDiscount ?? (isWeekly ? 0 : 10000),
      maxBidDiscount: group.maxBidDiscount ?? (isWeekly ? 0 : 40000),
      payoutRuleNotes:
        group.notes ||
        (isWeekly
          ? 'Diwali weekly scheme: ₹10,400 per ticket festival payout after 52 weeks.'
          : 'Winning bidder receives stated ₹1,00,000 prize minus bid discount & 5% foreman commission.'),
      confirmActivation: false,
    });
    setActivateError(null);
    setIsActivateModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <TopHeader
        title={group.name}
        subtitle={`${group.groupCode} • ${isWeekly ? 'Weekly Scheme' : 'Monthly Scheme'}`}
        showBack
        backPath="/chit-groups"
        rightAction={
          <Link
            to={`/chit-groups/${group.id}/schedule`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs touch-target"
          >
            <FileSpreadsheet size={15} className="text-teal-700" />
            <span>Installment Schedule</span>
          </Link>
        }
      />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Planned Status Banner (Requirement 2 & Scheme B) */}
        {isPlanned && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Clock size={20} className="text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  Planned Scheme — Pending Owner Activation
                </h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  Member capacity, start date, and payout rules must be reviewed and confirmed before activating collections and auctions.
                </p>
              </div>
            </div>

            <button
              onClick={openActivationModal}
              className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs transition-colors shadow-xs touch-target shrink-0"
            >
              Review & Confirm Activation
            </button>
          </div>
        )}

        {/* Scheme Terms Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                  {group.groupCode}
                </span>
                <span className="text-xs font-semibold text-slate-500 capitalize">
                  {isWeekly ? 'Weekly Scheme' : 'Monthly Scheme'} •{' '}
                  {group.chitType.replace('_', ' ').toLowerCase()}
                </span>
                {isPlanned ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    PLANNED DRAFT
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    ACTIVE
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">{group.name}</h2>
            </div>

            <div className="text-right">
              <div className="text-xl font-black text-teal-800 tabular-nums">
                {formatINR(group.totalValue)}
              </div>
              <div className="text-xs text-slate-500">
                {group.chitType === 'AUCTION_BASED' ? 'Stated Winner Prize Value' : 'Total Scheme Value'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
            <div>
              <span className="text-slate-500 block">
                {isWeekly ? 'Weekly Contribution' : 'Monthly Contribution'}
              </span>
              <span className="font-bold text-slate-900 text-sm tabular-nums">
                {formatINR(group.monthlyContribution)}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">Current {periodLabel} / Term</span>
              <span className="font-bold text-slate-900 text-sm tabular-nums">
                {periodLabel} {group.currentMonth} of {group.totalMonths}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 block">Commission & Earnings</span>
                <button
                  type="button"
                  onClick={openCommissionModal}
                  className="text-[10px] text-teal-700 font-bold hover:underline inline-flex items-center gap-0.5"
                >
                  <Settings size={10} />
                  <span>Configure</span>
                </button>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-bold text-slate-900 text-sm tabular-nums">
                  {group.commissionType === 'NO_COMMISSION'
                    ? 'No Commission (₹0)'
                    : group.commissionType === 'FIXED_AMOUNT_PER_INSTALLMENT'
                      ? `₹${Number(group.commissionAmount || 0).toLocaleString('en-IN')} / cycle`
                      : group.commissionType === 'FIXED_AMOUNT_PER_CHIT_GROUP'
                        ? `₹${Number(group.commissionAmount || 0).toLocaleString('en-IN')} Flat Fee`
                        : group.commissionType === 'PERCENTAGE_OF_EACH_COLLECTION'
                          ? `${group.commissionRate}% of collections`
                          : group.commissionType === 'AUCTION_BASED_EARNINGS'
                            ? `Auction Margin (~${group.commissionRate ?? 5}%)`
                            : group.commissionType === 'CUSTOM_OTHER'
                              ? 'Custom Rules'
                              : `${group.commissionRate ?? group.foremanCommissionRate}% (₹${(
                                  group.totalValue *
                                  ((group.commissionRate ?? group.foremanCommissionRate) / 100)
                                ).toLocaleString('en-IN')})`}
                </span>
                {group.isCommissionConfirmed ? (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Confirmed
                  </span>
                ) : (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                    Draft
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-slate-500 block">Start Date</span>
              <span className="font-bold text-slate-900 text-sm">
                {formatDate(group.startDate)}
              </span>
            </div>
          </div>

          {group.notes && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg whitespace-pre-line">
              <strong className="text-slate-700">Scheme Rules & Notes: </strong>
              {group.notes}
            </div>
          )}
        </div>

        {/* Members & Ticket Slots */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-teal-700" />
              <h3 className="text-sm font-semibold text-slate-900">
                Enrolled Members ({group.memberships?.length || 0}/{group.totalMonths} Slots)
              </h3>
            </div>

            {nextAvailableTicket && (
              <button
                onClick={() => {
                  setEnrollForm((prev) => ({ ...prev, ticketNumber: nextAvailableTicket }));
                  setIsEnrollModalOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs touch-target transition-colors"
              >
                <UserPlus size={14} />
                <span>Enroll Member</span>
              </button>
            )}
          </div>

          {!group.memberships || group.memberships.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No members enrolled in this chit group yet. Tap "Enroll Member" to assign tickets.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {group.memberships.map((m: any) => (
                <div key={m.id} className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 font-mono font-bold text-xs flex items-center justify-center text-slate-800 shrink-0">
                      #{m.ticketNumber}
                    </div>

                    <div>
                      <Link
                        to={`/customers/${m.customer.id}`}
                        className="text-sm font-bold text-slate-900 hover:text-teal-700 transition-colors"
                      >
                        {m.customer.fullName}
                      </Link>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{formatPhone(m.customer.phone)}</span>
                        <span>•</span>
                        <span className="font-mono text-[11px]">{m.customer.customerCode}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {m.isPrized ? (
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 block">
                          Prized ({periodLabel} {m.prizedMonth})
                        </span>
                        {m.prizeAmount && (
                          <span className="text-xs font-bold text-slate-700 tabular-nums mt-0.5 block">
                            {formatINR(m.prizeAmount)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        Non-Prized
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review & Confirm Activation Modal */}
      {isActivateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-amber-700" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Confirm & Activate Chit Group</h3>
                  <p className="text-xs text-slate-500">
                    Verify member capacity, schedule dates, and payout rules
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsActivateModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {activateError && (
              <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{activateError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setActivateError(null);
                if (!activateForm.confirmActivation) {
                  setActivateError('You must explicitly confirm compliance with scheme rules.');
                  return;
                }
                activateMutation.mutate(activateForm);
              }}
              className="space-y-3.5 mt-4 text-xs"
            >
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                <strong>Requirement:</strong> Ensure all scheme rules are finalized. Once activated, the schedule is locked for audit integrity and collections begin.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirmed Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={activateForm.startDate}
                    onChange={(e) =>
                      setActivateForm({ ...activateForm, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirmed Member Capacity ({isWeekly ? 'Weeks' : 'Months'}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="2"
                    value={activateForm.totalMonths}
                    onChange={(e) =>
                      setActivateForm({ ...activateForm, totalMonths: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none font-bold tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Max Bid Discount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={activateForm.maxBidDiscount}
                  onChange={(e) =>
                    setActivateForm({
                      ...activateForm,
                      maxBidDiscount: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none font-bold"
                />
              </div>

              {/* Commission & Earnings Configuration Section in Activation */}
              <CommissionConfigSection
                value={{
                  commissionType: (activateForm.commissionType as CommissionType) || 'PERCENTAGE_OF_CHIT_VALUE',
                  commissionRate: activateForm.commissionRate,
                  commissionAmount: activateForm.commissionAmount,
                  commissionCalculationBase: activateForm.commissionCalculationBase,
                  commissionNotes: activateForm.commissionNotes,
                  isCommissionConfirmed: activateForm.isCommissionConfirmed ?? false,
                }}
                onChange={(config) =>
                  setActivateForm({
                    ...activateForm,
                    commissionType: config.commissionType,
                    commissionRate: config.commissionRate,
                    commissionAmount: config.commissionAmount,
                    commissionCalculationBase: config.commissionCalculationBase,
                    commissionNotes: config.commissionNotes,
                    isCommissionConfirmed: config.isCommissionConfirmed,
                    foremanCommissionRate: config.commissionRate ?? activateForm.foremanCommissionRate,
                  })
                }
                totalChitValue={group.totalValue}
                installmentAmount={group.monthlyContribution}
                totalPeriods={activateForm.totalMonths}
                isWeekly={isWeekly}
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirmed Payout Terms & Calculation Rules *
                </label>
                <textarea
                  rows={2}
                  required
                  value={activateForm.payoutRuleNotes}
                  onChange={(e) =>
                    setActivateForm({ ...activateForm, payoutRuleNotes: e.target.value })
                  }
                  placeholder="Detail the agreed payout calculation, deductions, and non-prized dividend rules..."
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-100 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="confirmCompliance"
                  checked={activateForm.confirmActivation}
                  onChange={(e) =>
                    setActivateForm({ ...activateForm, confirmActivation: e.target.checked })
                  }
                  className="mt-0.5 rounded border-slate-300 text-teal-700 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                />
                <label
                  htmlFor="confirmCompliance"
                  className="text-xs text-slate-700 leading-snug cursor-pointer select-none"
                >
                  I (Durga) confirm that the member capacity, start date, and payout rules comply with the scheme agreement.
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsActivateModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={activateMutation.isPending || !activateForm.confirmActivation}
                  className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs transition-colors disabled:opacity-50 shadow-xs"
                >
                  {activateMutation.isPending ? 'Activating...' : 'Confirm & Activate Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Member Modal */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Enroll Customer to Scheme</h3>
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {enrollError && (
              <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{enrollError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setEnrollError(null);
                if (!enrollForm.customerId) {
                  setEnrollError('Please select a customer');
                  return;
                }
                enrollMutation.mutate(enrollForm);
              }}
              className="space-y-3 mt-4 text-xs"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Customer *
                </label>
                <select
                  required
                  value={enrollForm.customerId}
                  onChange={(e) => setEnrollForm({ ...enrollForm, customerId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers?.items?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.customerCode}) - {c.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Ticket Number (1 to {group.totalMonths}) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={group.totalMonths}
                  value={enrollForm.ticketNumber}
                  onChange={(e) =>
                    setEnrollForm({ ...enrollForm, ticketNumber: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none font-bold tabular-nums"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nominee Name
                  </label>
                  <input
                    type="text"
                    value={enrollForm.nomineeName}
                    onChange={(e) =>
                      setEnrollForm({ ...enrollForm, nomineeName: e.target.value })
                    }
                    placeholder="e.g. S. Kumar"
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nominee Phone
                  </label>
                  <input
                    type="tel"
                    value={enrollForm.nomineePhone}
                    onChange={(e) =>
                      setEnrollForm({ ...enrollForm, nomineePhone: e.target.value })
                    }
                    placeholder="e.g. 9848012345"
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrollMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-colors disabled:opacity-50 shadow-xs"
                >
                  {enrollMutation.isPending ? 'Enrolling...' : 'Confirm Ticket Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Standalone Commission & Earnings Configuration Modal */}
      {isCommissionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                  <Percent size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Configure Commission & Earnings
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {group.name} ({group.groupCode})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCommissionModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {commissionError && (
              <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{commissionError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setCommissionError(null);
                updateCommissionMutation.mutate(commissionForm);
              }}
              className="space-y-4 mt-4"
            >
              <CommissionConfigSection
                value={commissionForm}
                onChange={(val) =>
                  setCommissionForm({
                    commissionType: val.commissionType,
                    commissionRate: val.commissionRate,
                    commissionAmount: val.commissionAmount,
                    commissionCalculationBase: val.commissionCalculationBase || 'CHIT_VALUE',
                    commissionNotes: val.commissionNotes || '',
                    isCommissionConfirmed: val.isCommissionConfirmed,
                  })
                }
                totalChitValue={group.totalValue}
                installmentAmount={group.monthlyContribution}
                totalPeriods={group.totalMonths}
                isWeekly={isWeekly}
              />

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCommissionModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateCommissionMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-colors disabled:opacity-50 shadow-xs"
                >
                  {updateCommissionMutation.isPending ? 'Saving...' : 'Save & Confirm Commission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChitGroupDetailPage;
