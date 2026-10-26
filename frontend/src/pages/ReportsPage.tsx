import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, Layers } from 'lucide-react';
import { dashboardApi } from '../api/dashboard';
import { chitGroupsApi } from '../api/chit-groups';
import { TopHeader } from '../components/layout/TopHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatINR } from '../utils/formatters';

export const ReportsPage: React.FC = () => {
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: dashboardApi.getStats,
  });

  const { data: groups, isLoading: isGroupsLoading } = useQuery({
    queryKey: ['chitGroups'],
    queryFn: chitGroupsApi.getAll,
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <TopHeader
        title="Business Reports"
        subtitle="Ledger & Financial Statements"
        rightAction={
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors shadow-xs touch-target"
          >
            <Printer size={15} />
            <span>Print Report</span>
          </button>
        }
      />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {isStatsLoading || isGroupsLoading ? (
          <LoadingSpinner message="Aggregating financial reports..." />
        ) : (
          <>
            {/* Owner Revenue Summary */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                Proprietor Revenue Summary (Durga Chit Fund)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-teal-50 border border-teal-200">
                  <span className="text-[11px] font-semibold text-teal-800 uppercase block">
                    Foreman 5% Commission
                  </span>
                  <span className="text-xl font-black text-teal-950 tabular-nums">
                    {formatINR(stats?.financials.foremanCommissionEarned ?? 0)}
                  </span>
                  <span className="text-[10px] text-teal-700 block mt-0.5">
                    From {stats?.financials.auctionsConducted ?? 0} completed auctions
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-600 uppercase block">
                    This Month's Collections
                  </span>
                  <span className="text-xl font-black text-slate-900 tabular-nums">
                    {formatINR(stats?.financials.collectionsThisMonth ?? 0)}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {stats?.financials.collectionsCountThisMonth ?? 0} receipts issued
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <span className="text-[11px] font-semibold text-amber-800 uppercase block">
                    Active Outstanding Dues
                  </span>
                  <span className="text-xl font-black text-amber-950 tabular-nums">
                    {formatINR(stats?.financials.totalPendingDues ?? 0)}
                  </span>
                  <span className="text-[10px] text-amber-700 block mt-0.5">
                    Pending across current installments
                  </span>
                </div>
              </div>
            </div>

            {/* Scheme-wise Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-teal-700" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Scheme-wise Portfolio Performance
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-3.5">Scheme Code</th>
                      <th className="py-3 px-3.5">Chit Name</th>
                      <th className="py-3 px-3.5">Pool Value</th>
                      <th className="py-3 px-3.5">Members Enrolled</th>
                      <th className="py-3 px-3.5">Term Progress</th>
                      <th className="py-3 px-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {groups?.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                          {g.groupCode}
                        </td>
                        <td className="py-3 px-3.5 font-semibold text-slate-900">{g.name}</td>
                        <td className="py-3 px-3.5 tabular-nums">{formatINR(g.totalValue)}</td>
                        <td className="py-3 px-3.5">
                          {g.enrolledMembersCount}/{g.totalMonths} slots
                        </td>
                        <td className="py-3 px-3.5">
                          Month {g.currentMonth} of {g.totalMonths}
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                            {g.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
