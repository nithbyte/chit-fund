import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Plus,
  Users,
  ChevronRight,
  X,
  AlertCircle,
  Sparkles,
  HelpCircle,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { chitGroupsApi, type SchemeTemplate } from '../api/chit-groups';
import { TopHeader } from '../components/layout/TopHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatINR } from '../utils/formatters';

export const ChitGroupsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    groupCode: '',
    name: '',
    chitType: 'AUCTION_BASED' as 'AUCTION_BASED' | 'FIXED_INSTALLMENT',
    totalValue: 100000,
    monthlyContribution: 5000,
    totalMonths: 20,
    startDate: new Date().toISOString().split('T')[0],
    foremanCommissionRate: 5.0,
    minBidDiscount: 10000,
    maxBidDiscount: 40000,
    auctionFrequency: 'MONTHLY' as 'MONTHLY' | 'WEEKLY',
    status: 'ACTIVE' as 'PLANNED' | 'ACTIVE',
    notes: '',
  });

  const { data: groups, isLoading, error } = useQuery({
    queryKey: ['chitGroups'],
    queryFn: chitGroupsApi.getAll,
  });

  const { data: templates } = useQuery({
    queryKey: ['schemeTemplates'],
    queryFn: chitGroupsApi.getTemplates,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => chitGroupsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chitGroups'] });
      setIsModalOpen(false);
      setSelectedTemplateId(null);
      setFormData({
        groupCode: '',
        name: '',
        chitType: 'AUCTION_BASED',
        totalValue: 100000,
        monthlyContribution: 5000,
        totalMonths: 20,
        startDate: new Date().toISOString().split('T')[0],
        foremanCommissionRate: 5.0,
        minBidDiscount: 10000,
        maxBidDiscount: 40000,
        auctionFrequency: 'MONTHLY',
        status: 'ACTIVE',
        notes: '',
      });
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create chit group');
    },
  });

  const handleApplyTemplate = (tmpl: SchemeTemplate) => {
    setSelectedTemplateId(tmpl.templateId);
    setFormError(null);

    const yearSuffix = new Date().getFullYear();
    const isWeekly = tmpl.frequency === 'WEEKLY';

    setFormData({
      groupCode: isWeekly ? `DW-${yearSuffix}-52W` : `LK-100K-20M`,
      name: isWeekly ? `Diwali Weekly Chit ${yearSuffix}` : `₹1 Lakh Monthly Chit`,
      chitType: tmpl.chitType,
      totalValue: tmpl.totalChitValue,
      monthlyContribution: tmpl.installmentAmount,
      totalMonths: tmpl.durationPeriods,
      startDate: new Date().toISOString().split('T')[0],
      foremanCommissionRate: tmpl.defaultCommissionRate,
      minBidDiscount: isWeekly ? 0 : 10000,
      maxBidDiscount: isWeekly ? 0 : 40000,
      auctionFrequency: tmpl.frequency,
      status: tmpl.requiresMemberConfirmation ? 'PLANNED' : 'ACTIVE',
      notes: tmpl.notes,
    });

    setIsModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    createMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <TopHeader
        title="Chit Schemes"
        subtitle="Weekly & Monthly Savings Batches"
        rightAction={
          <button
            onClick={() => {
              setSelectedTemplateId(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors shadow-xs touch-target"
          >
            <Plus size={16} />
            <span>Create Custom Group</span>
          </button>
        }
      />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Approved Scheme Templates Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-teal-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Approved Standard Scheme Templates
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Quick-start verified schemes for Durga Chit Fund with pre-configured installment formulas.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Scheme A: Diwali Weekly Chit */}
            <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase tracking-wider">
                    Scheme A • Weekly
                  </span>
                  <span className="text-xs font-black text-teal-900">₹200 / Week</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-1.5">Diwali Weekly Chit</h4>
                <p className="text-xs text-slate-600 mt-1">
                  1-year duration (52 weekly installments). Expected total contribution per member: <strong className="text-slate-900">₹10,400</strong>.
                </p>
                <div className="mt-2 text-[11px] text-teal-800 font-medium">
                  ✓ Configurable start date, member capacity & festival payout rules.
                </div>
              </div>

              <button
                onClick={() => {
                  const tmpl = templates?.find((t) => t.templateId === 'TEMPLATE_DIWALI_WEEKLY');
                  if (tmpl) handleApplyTemplate(tmpl);
                }}
                className="mt-3.5 w-full py-2 px-3 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shadow-xs"
              >
                Configure Diwali Scheme
              </button>
            </div>

            {/* Scheme B: ₹1 Lakh Chit */}
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase tracking-wider">
                    Scheme B • Monthly
                  </span>
                  <span className="text-xs font-black text-amber-900">₹5,000 / Month</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-1.5">₹1 Lakh Chit Scheme</h4>
                <p className="text-xs text-slate-600 mt-1">
                  20-month duration (20 installments). Stated prize value: <strong className="text-slate-900">₹1,00,000</strong>. Total contribution: ₹1,00,000.
                </p>
                <div className="mt-2 text-[11px] text-amber-800 font-medium flex items-center gap-1">
                  <HelpCircle size={13} className="shrink-0" />
                  <span>Requires owner confirmation of member count & auction rules.</span>
                </div>
              </div>

              <button
                onClick={() => {
                  const tmpl = templates?.find((t) => t.templateId === 'TEMPLATE_1_LAKH_MONTHLY');
                  if (tmpl) handleApplyTemplate(tmpl);
                }}
                className="mt-3.5 w-full py-2 px-3 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition-colors shadow-xs"
              >
                Configure ₹1 Lakh Scheme
              </button>
            </div>
          </div>
        </div>

        {/* Existing Groups List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Active & Planned Chit Batches
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {groups?.length ?? 0} groups registered
            </span>
          </div>

          {isLoading ? (
            <LoadingSpinner message="Loading chit schemes..." />
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
              Failed to load chit groups.
            </div>
          ) : groups && groups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {groups.map((group) => {
                const enrolled = group.enrolledMembersCount ?? 0;
                const totalSlots = group.totalMonths;
                const fillPct = Math.round((enrolled / totalSlots) * 100);
                const isWeekly = group.isWeekly || (group.auctionFrequency || '').toUpperCase() === 'WEEKLY';
                const isPlanned = group.status === 'PLANNED';

                return (
                  <Link
                    key={group.id}
                    to={`/chit-groups/${group.id}`}
                    className={`bg-white rounded-xl border p-4 shadow-xs hover:border-teal-400 hover:shadow-sm transition-all block ${
                      isPlanned ? 'border-amber-300 bg-amber-50/10' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 border border-slate-200">
                            {group.groupCode}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isWeekly
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : 'bg-teal-50 text-teal-800 border-teal-200'
                            }`}
                          >
                            {isWeekly ? 'Weekly' : 'Monthly'}
                          </span>
                          {isPlanned ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                              <Clock size={11} />
                              <span>Planned / Pending Activation</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Active
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                          {group.name}
                        </h3>
                      </div>

                      <div className="text-right">
                        <div className="text-base sm:text-lg font-black text-teal-900 tabular-nums">
                          {formatINR(group.totalValue)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {group.chitType === 'AUCTION_BASED' ? 'Stated Value' : 'Total Scheme Value'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-3 text-center border-b border-slate-100">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-medium">
                          {isWeekly ? 'Weekly Due' : 'Monthly Due'}
                        </div>
                        <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                          {formatINR(group.monthlyContribution)}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-medium">Progress</div>
                        <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                          {isWeekly ? 'Wk' : 'Mo'} {group.currentMonth}/{group.totalMonths}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-medium">Duration</div>
                        <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                          {isWeekly ? `${group.totalMonths} Weeks` : `${group.totalMonths} Mos`}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-slate-400" />
                        <span className="text-slate-600 font-medium">
                          {enrolled}/{totalSlots} slots enrolled
                        </span>
                        {totalSlots - enrolled > 0 && (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            {totalSlots - enrolled} vacant
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-teal-700 font-semibold">
                        <span>{isPlanned ? 'Review & Activate' : 'Schedule & Ledger'}</span>
                        <ChevronRight size={15} />
                      </div>
                    </div>

                    {/* Capacity Progress bar */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                      <div
                        className="bg-teal-600 h-full rounded-full transition-all"
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
              <p className="text-sm text-slate-700 font-medium">No chit groups created yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Choose one of the approved scheme templates above to launch your first chit batch.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New / Configure Chit Group Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedTemplateId === 'TEMPLATE_DIWALI_WEEKLY'
                    ? 'Configure Diwali Weekly Chit'
                    : selectedTemplateId === 'TEMPLATE_1_LAKH_MONTHLY'
                    ? 'Configure ₹1 Lakh Monthly Chit'
                    : 'Create New Chit Scheme'}
                </h3>
                <p className="text-xs text-slate-500">
                  Define start date, member capacity, and payout terms.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scheme B Financial Distinction Callout */}
            {selectedTemplateId === 'TEMPLATE_1_LAKH_MONTHLY' && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <ShieldAlert size={15} className="shrink-0 text-amber-700" />
                  <span>Important Financial Rule</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  The ₹1,00,000 chit value represents the stated amount paid to the winning member. It is not automatically the monthly collection total or guaranteed net payout. Member count, auction deductions, and net payouts must be confirmed.
                </p>
              </div>
            )}

            {/* Scheme A Weekly Callout */}
            {selectedTemplateId === 'TEMPLATE_DIWALI_WEEKLY' && (
              <div className="mt-3 p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 space-y-1">
                <div className="font-bold text-teal-950">Weekly Schedule Formula</div>
                <p className="text-[11px] leading-relaxed text-teal-800">
                  Contribution is ₹200 per week for 52 weekly installments (1 year). Total contribution per member over 52 weeks is exactly ₹10,400.
                </p>
              </div>
            )}

            {formError && (
              <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Group Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.groupCode}
                    onChange={(e) => setFormData({ ...formData, groupCode: e.target.value })}
                    placeholder="e.g. DW-2026-52W"
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Frequency *
                  </label>
                  <select
                    value={formData.auctionFrequency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        auctionFrequency: e.target.value as 'MONTHLY' | 'WEEKLY',
                      })
                    }
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none font-semibold text-slate-800"
                  >
                    <option value="WEEKLY">Weekly (7-day intervals)</option>
                    <option value="MONTHLY">Monthly (Calendar months)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scheme Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Diwali Weekly Chit 2026"
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Scheme Type *
                  </label>
                  <select
                    value={formData.chitType}
                    onChange={(e) =>
                      setFormData({ ...formData, chitType: e.target.value as any })
                    }
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  >
                    <option value="AUCTION_BASED">Auction Based Chit</option>
                    <option value="FIXED_INSTALLMENT">Fixed Savings Scheme</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {formData.auctionFrequency === 'WEEKLY' ? 'Weekly Due (₹) *' : 'Monthly Due (₹) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.monthlyContribution}
                    onChange={(e) =>
                      setFormData({ ...formData, monthlyContribution: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none font-bold tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total {formData.auctionFrequency === 'WEEKLY' ? 'Weeks' : 'Months'} (Capacity) *
                  </label>
                  <input
                    type="number"
                    required
                    min="2"
                    value={formData.totalMonths}
                    onChange={(e) => setFormData({ ...formData, totalMonths: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none font-bold tabular-nums"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Total installments: {formData.totalMonths}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stated Chit Value (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="100"
                    value={formData.totalValue}
                    onChange={(e) => setFormData({ ...formData, totalValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none font-bold tabular-nums text-teal-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Stated payout prize amount
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Foreman Commission (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={formData.foremanCommissionRate}
                    onChange={(e) =>
                      setFormData({ ...formData, foremanCommissionRate: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none font-bold tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payout & Scheme Terms Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Prize payout details, Deepavali festival bonus terms..."
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={createMutation.isPending}
                    onClick={() => {
                      createMutation.mutate({
                        ...formData,
                        status: 'PLANNED',
                      });
                    }}
                    className="px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs font-bold hover:bg-amber-100 transition-colors"
                  >
                    Save as Planned / Draft
                  </button>

                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-xs"
                  >
                    {createMutation.isPending ? 'Creating Scheme...' : 'Confirm & Launch Scheme'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChitGroupsPage;
