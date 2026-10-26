import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  IndianRupee,
  Users,
  Layers,
  ArrowRight,
  PlusCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Receipt,
  Calendar,
  Building,
  Smartphone,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { dashboardApi } from '../api/dashboard';
import { TopHeader } from '../components/layout/TopHeader';
import { StatCard } from '../components/ui/StatCard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatINR, formatDate, formatPhone } from '../utils/formatters';

type DateFilterOption = 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM';

export const DashboardPage: React.FC = () => {
  const [filterType, setFilterType] = useState<DateFilterOption>('THIS_MONTH');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [expandedSection, setExpandedSection] = useState<'NONE' | 'DUE_TODAY' | 'OVERDUE'>('NONE');

  // Compute date range based on filterType
  const getDateRange = () => {
    const now = new Date();

    if (filterType === 'TODAY') {
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString(),
        endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString(),
      };
    }

    if (filterType === 'YESTERDAY') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return {
        startDate: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0).toISOString(),
        endDate: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999).toISOString(),
      };
    }

    if (filterType === 'THIS_WEEK') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      const monday = new Date(now);
      monday.setDate(diff);
      return {
        startDate: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0, 0).toISOString(),
        endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString(),
      };
    }

    if (filterType === 'CUSTOM' && customStart && customEnd) {
      return {
        startDate: new Date(`${customStart}T00:00:00.000Z`).toISOString(),
        endDate: new Date(`${customEnd}T23:59:59.999Z`).toISOString(),
      };
    }

    // Default: THIS_MONTH
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return {
      startDate: startOfMonth.toISOString(),
      endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString(),
    };
  };

  const { startDate, endDate } = getDateRange();

  const { data: stats, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboardStats', startDate, endDate],
    queryFn: () => dashboardApi.getStats({ startDate, endDate }),
    refetchInterval: 20000,
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-16 md:pb-8">
      <TopHeader
        title="Dashboard"
        subtitle="Financial Overview & Daily Collections"
        rightAction={
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 rounded-lg text-slate-600 hover:text-teal-700 hover:bg-slate-100 transition-colors"
            title="Refresh statistics"
          >
            <RotateCcw size={16} className={isFetching ? 'animate-spin text-teal-700' : ''} />
          </button>
        }
      />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Quick Action Bar (Primary Mobile Touch Targets) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Link
            to="/collect"
            className="flex flex-col sm:flex-row items-center justify-center gap-1.5 p-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl shadow-xs transition-all touch-target text-center"
          >
            <IndianRupee size={18} />
            <span className="text-xs font-bold leading-tight">Collect Payment</span>
          </Link>

          <Link
            to="/customers/new"
            className="flex flex-col sm:flex-row items-center justify-center gap-1.5 p-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl shadow-xs transition-all touch-target text-center"
          >
            <PlusCircle size={18} className="text-teal-700" />
            <span className="text-xs font-bold leading-tight">Add Customer</span>
          </Link>

          <Link
            to="/register"
            className="flex flex-col sm:flex-row items-center justify-center gap-1.5 p-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl shadow-xs transition-all touch-target text-center"
          >
            <Receipt size={18} className="text-amber-600" />
            <span className="text-xs font-bold leading-tight">View Dues</span>
          </Link>
        </div>

        {/* Date Selector Filter Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={13} className="text-teal-700" />
              <span>Collection Period</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {filterType === 'TODAY'
                ? 'Today'
                : filterType === 'YESTERDAY'
                ? 'Yesterday'
                : filterType === 'THIS_WEEK'
                ? 'Current Week'
                : filterType === 'THIS_MONTH'
                ? 'Current Month'
                : 'Custom Range'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {(
              [
                { id: 'TODAY', label: 'Today' },
                { id: 'YESTERDAY', label: 'Yesterday' },
                { id: 'THIS_WEEK', label: 'This Week' },
                { id: 'THIS_MONTH', label: 'This Month' },
                { id: 'CUSTOM', label: 'Custom' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setFilterType(opt.id)}
                className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-all ${
                  filterType === opt.id
                    ? 'bg-teal-700 text-white shadow-xs font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {filterType === 'CUSTOM' && (
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">From Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">To Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>
            </div>
          )}
        </div>

        {/* Loading / Error States */}
        {isLoading ? (
          <LoadingSpinner message="Calculating real-time collection metrics from ledger..." />
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
            Failed to load dashboard metrics. Please check network connection or database status.
          </div>
        ) : stats ? (
          <>
            {/* Primary Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Today's Recorded Collections */}
              <StatCard
                title="Today's Collections"
                value={formatINR(stats.financials.collectionsToday)}
                subtitle={`${stats.financials.collectionsCountToday} receipts collected today`}
                icon={IndianRupee}
                variant="teal"
              />

              {/* Total Collections for Selected Range */}
              <StatCard
                title="Selected Range Total"
                value={formatINR(stats.financials.collectionsSelectedRange)}
                subtitle={`${stats.financials.collectionsCountSelectedRange} collections in selected view`}
                icon={TrendingUp}
                variant="default"
              />

              {/* Overdue Installments */}
              <div
                onClick={() =>
                  setExpandedSection((prev) => (prev === 'OVERDUE' ? 'NONE' : 'OVERDUE'))
                }
                className="cursor-pointer"
              >
                <StatCard
                  title="Overdue Installments"
                  value={formatINR(stats.financials.overdue.amount)}
                  subtitle={`${stats.financials.overdue.count} installments overdue (tap to expand)`}
                  icon={AlertTriangle}
                  variant="amber"
                />
              </div>

              {/* Total Pending Dues */}
              <div
                onClick={() =>
                  setExpandedSection((prev) => (prev === 'DUE_TODAY' ? 'NONE' : 'DUE_TODAY'))
                }
                className="cursor-pointer"
              >
                <StatCard
                  title="Due Today"
                  value={formatINR(stats.financials.dueToday.amount)}
                  subtitle={`${stats.financials.dueToday.count} installments due today`}
                  icon={Clock}
                  variant="navy"
                />
              </div>
            </div>

            {/* Payment Method Breakdown Bar for Selected Period */}
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>Collections by Payment Mode (Gross Received)</span>
                <span className="text-[10px] text-slate-400 font-normal">Real ledger totals</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-semibold mb-0.5">
                    <IndianRupee size={13} />
                    <span>Cash</span>
                  </div>
                  <div className="text-sm font-bold text-emerald-950 tabular-nums">
                    {formatINR(stats.financials.modeTotals.cash)}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200">
                  <div className="flex items-center gap-1.5 text-sky-800 text-xs font-semibold mb-0.5">
                    <Smartphone size={13} />
                    <span>UPI App</span>
                  </div>
                  <div className="text-sm font-bold text-sky-950 tabular-nums">
                    {formatINR(stats.financials.modeTotals.upi)}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
                  <div className="flex items-center gap-1.5 text-indigo-800 text-xs font-semibold mb-0.5">
                    <Building size={13} />
                    <span>Bank Transfer</span>
                  </div>
                  <div className="text-sm font-bold text-indigo-950 tabular-nums">
                    {formatINR(stats.financials.modeTotals.bankTransfer)}
                  </div>
                </div>
              </div>
            </div>

            {/* Expandable Alert List: Overdue Installments */}
            {expandedSection === 'OVERDUE' && (
              <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-700" />
                    <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                      Overdue Installments ({stats.financials.overdue.count})
                    </h3>
                  </div>
                  <button
                    onClick={() => setExpandedSection('NONE')}
                    className="text-amber-800 hover:text-amber-950 p-1"
                  >
                    <ChevronUp size={16} />
                  </button>
                </div>

                {stats.financials.overdue.items.length === 0 ? (
                  <p className="text-xs text-amber-800">No overdue installments! All collections are up to date.</p>
                ) : (
                  <div className="space-y-2">
                    {stats.financials.overdue.items.map((item, idx) => (
                      <div
                        key={`${item.customerId}-${item.chitGroupId}-${idx}`}
                        className="bg-white p-3 rounded-lg border border-amber-200 flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">{item.customerName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">({item.customerCode})</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {item.groupName} • Ticket #{item.ticketNumber} • Due {formatDate(item.dueDate)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold text-red-700 tabular-nums">
                            {formatINR(item.remainingDue)}
                          </span>
                          <Link
                            to={`/collect?customerId=${item.customerId}`}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md shadow-2xs"
                          >
                            Collect
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Expandable Alert List: Installments Due Today */}
            {expandedSection === 'DUE_TODAY' && (
              <div className="bg-sky-50/70 border border-sky-300 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-sky-700" />
                    <h3 className="text-xs font-bold text-sky-900 uppercase tracking-wide">
                      Installments Due Today ({stats.financials.dueToday.count})
                    </h3>
                  </div>
                  <button
                    onClick={() => setExpandedSection('NONE')}
                    className="text-sky-800 hover:text-sky-950 p-1"
                  >
                    <ChevronUp size={16} />
                  </button>
                </div>

                {stats.financials.dueToday.items.length === 0 ? (
                  <p className="text-xs text-sky-800">No installments scheduled due for today.</p>
                ) : (
                  <div className="space-y-2">
                    {stats.financials.dueToday.items.map((item, idx) => (
                      <div
                        key={`${item.customerId}-${item.chitGroupId}-${idx}`}
                        className="bg-white p-3 rounded-lg border border-sky-200 flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">{item.customerName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">({item.customerCode})</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {item.groupName} • Ticket #{item.ticketNumber} • Month {item.monthNumber}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold text-sky-900 tabular-nums">
                            {formatINR(item.remainingDue)}
                          </span>
                          <Link
                            to={`/collect?customerId=${item.customerId}`}
                            className="px-2.5 py-1 bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold rounded-md shadow-2xs"
                          >
                            Collect
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Operational Indicators */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Active Customers
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums mt-0.5">
                    {stats.operations.activeCustomersCount}{' '}
                    <span className="text-xs font-normal text-slate-500">enrolled</span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Users size={18} />
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Active Groups
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums mt-0.5">
                    {stats.operations.activeGroupsCount}{' '}
                    <span className="text-xs font-normal text-slate-500">running</span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Layers size={18} />
                </div>
              </div>
            </div>

            {/* Recent Collections Table / List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-teal-700" />
                  <h3 className="text-sm font-semibold text-slate-900">Recent Collections</h3>
                </div>
                <Link
                  to="/register"
                  className="text-xs text-teal-700 hover:text-teal-800 font-semibold flex items-center gap-1"
                >
                  <span>Full Register</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              {stats.recentCollections.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No collection entries recorded yet. Tap "Collect Payment" to record your first receipt.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {stats.recentCollections.map((col) => (
                    <Link
                      key={col.id}
                      to={`/receipts/${col.id}`}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors block"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 truncate">
                            {col.customerName}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            {col.customerCode}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>{formatPhone(col.customerPhone)}</span>
                          <span>•</span>
                          <span>{formatDate(col.paymentDate)}</span>
                          <span>•</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-teal-50 text-teal-700 uppercase">
                            {col.paymentMode}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-teal-800 tabular-nums">
                          +{formatINR(col.amount)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {col.receiptNumber}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Active Chit Batches */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-teal-700" />
                  <h3 className="text-sm font-semibold text-slate-900">Active Chit Batches</h3>
                </div>
                <Link
                  to="/chit-groups"
                  className="text-xs text-teal-700 hover:text-teal-800 font-semibold"
                >
                  View All
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {stats.upcomingGroups.map((g) => (
                  <Link
                    key={g.id}
                    to={`/chit-groups/${g.id}`}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-teal-300 transition-all block"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900">{g.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {g.groupCode} • {formatINR(g.monthlyContribution)}/mo
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                        Month {g.currentMonth}/{g.totalMonths}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
