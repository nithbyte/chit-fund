import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, CheckCircle } from 'lucide-react';
import { chitGroupsApi } from '../api/chit-groups';
import { TopHeader } from '../components/layout/TopHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatINR, formatDate } from '../utils/formatters';

export const ChitGroupSchedulePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [regenMessage, setRegenMessage] = useState<string | null>(null);

  const { data: group, isLoading, error } = useQuery({
    queryKey: ['chitGroup', id],
    queryFn: () => chitGroupsApi.getById(id!),
    enabled: !!id,
  });

  const generateMutation = useMutation({
    mutationFn: () => chitGroupsApi.generateSchedule(id!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chitGroup', id] });
      setRegenMessage(
        `Verified schedule: ${data.existingCount} existing, ${data.newlyCreatedCount} missing slots generated without duplicate records.`,
      );
      setTimeout(() => setRegenMessage(null), 5000);
    },
    onError: (err: any) => {
      alert(`Schedule verification error: ${err.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopHeader title="Installment Schedule" showBack backPath={`/chit-groups/${id}`} />
        <LoadingSpinner message="Generating installment ledger..." />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopHeader title="Installment Schedule" showBack backPath={`/chit-groups/${id}`} />
        <div className="max-w-md mx-auto p-4 mt-8 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
          Chit Group not found.
        </div>
      </div>
    );
  }

  const isWeekly = group.isWeekly || (group.auctionFrequency || '').toUpperCase() === 'WEEKLY';
  const periodTypeLabel = isWeekly ? 'Week' : 'Month';

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <TopHeader
        title={`${group.name} Schedule`}
        subtitle={`${group.groupCode} • ${periodTypeLabel} 1 to ${group.totalMonths} (${isWeekly ? 'Weekly' : 'Monthly'})`}
        showBack
        backPath={`/chit-groups/${group.id}`}
        rightAction={
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs touch-target disabled:opacity-50"
            title="Idempotently verify schedule and create any missing installments"
          >
            <RefreshCw size={13} className={generateMutation.isPending ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Verify Schedule</span>
          </button>
        }
      />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {regenMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle size={15} className="shrink-0 text-emerald-600" />
            <span>{regenMessage}</span>
          </div>
        )}

        {/* Schedule Summary Banner */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500 font-medium">
              {isWeekly ? 'Weekly' : 'Monthly'} Installment Schedule Matrix
            </div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              Contribution: {formatINR(group.monthlyContribution)} per {periodTypeLabel.toLowerCase()} • Current Active: {periodTypeLabel} {group.currentMonth}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              {group.memberships?.length || 0}/{group.totalMonths} Members Enrolled
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {isWeekly ? '7-Day Weekly Intervals' : 'Monthly Calendar Dues'}
            </span>
          </div>
        </div>

        {/* Schedule Table / List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3.5">{periodTypeLabel}</th>
                  <th className="py-3 px-3.5">Due Date</th>
                  <th className="py-3 px-3.5">Base Contribution</th>
                  <th className="py-3 px-3.5">Dividend / Ticket</th>
                  <th className="py-3 px-3.5">Net Payable</th>
                  <th className="py-3 px-3.5">Collection Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {group.installments?.map((inst: any) => {
                  const isCurrent = inst.monthNumber === group.currentMonth;

                  return (
                    <tr
                      key={inst.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrent ? 'bg-teal-50/40 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3 px-3.5 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span>
                            {periodTypeLabel} {inst.monthNumber}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-teal-700 text-white uppercase">
                              Active
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 text-slate-600">
                        {formatDate(inst.dueDate)}
                      </td>

                      <td className="py-3 px-3.5 tabular-nums text-slate-600">
                        {formatINR(inst.baseAmount)}
                      </td>

                      <td className="py-3 px-3.5 tabular-nums text-teal-700">
                        {inst.dividendPerTicket > 0 ? (
                          <span>-{formatINR(inst.dividendPerTicket)}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">₹0 (Standard)</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 tabular-nums font-bold text-slate-900">
                        {formatINR(inst.payableAmount)}
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-teal-600 h-full rounded-full"
                              style={{ width: `${inst.collectionPercentage ?? 0}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                            {formatINR(inst.totalCollected ?? 0)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChitGroupSchedulePage;
