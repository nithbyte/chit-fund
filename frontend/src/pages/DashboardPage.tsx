import React from 'react';
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
} from 'lucide-react';
import { dashboardApi } from '../api/dashboard';
import { TopHeader } from '../components/layout/TopHeader';
import { StatCard } from '../components/ui/StatCard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatINR, formatDate, formatPhone } from '../utils/formatters';

export const DashboardPage: React.FC = () => {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: dashboardApi.getStats,
    refetchInterval: 15000, // real-time 15s refresh
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <TopHeader
        title="Dashboard"
        subtitle="Financial Overview & Daily Collections"
      />

      <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6 space-y-5">
        {/* Quick Action Bar (Primary Mobile Touch Targets) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <Link
            to="/collect"
            className="flex items-center justify-center gap-2 p-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl shadow-xs transition-all touch-target text-xs font-semibold"
          >
            <IndianRupee size={16} />
            <span>Collect Money</span>
          </Link>

          <Link
            to="/customers/new"
            className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl shadow-xs transition-all touch-target text-xs font-semibold"
          >
            <PlusCircle size={16} className="text-teal-700" />
            <span>Add Customer</span>
          </Link>

          <Link
            to="/chit-groups"
            className="hidden sm:flex items-center justify-center gap-2 p-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl shadow-xs transition-all touch-target text-xs font-semibold"
          >
            <Layers size={16} className="text-slate-600" />
            <span>Chit Groups</span>
          </Link>
        </div>

        {isLoading ? (
          <LoadingSpinner message="Calculating latest financial figures..." />
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
            Failed to load dashboard metrics. Please check network connection.
          </div>
        ) : stats ? (
          <>
            {/* Primary Financial Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                title="Today's Collections"
                value={formatINR(stats.financials.collectionsToday)}
                subtitle={`${stats.financials.collectionsCountToday} collections recorded today`}
                icon={IndianRupee}
                variant="teal"
              />

              <StatCard
                title="This Month's Collections"
                value={formatINR(stats.financials.collectionsThisMonth)}
                subtitle={`${stats.financials.collectionsCountThisMonth} collections in ${new Date().toLocaleString('en-US', { month: 'short' })}`}
                icon={TrendingUp}
                variant="default"
              />

              <StatCard
                title="Total Outstanding Dues"
                value={formatINR(stats.financials.totalPendingDues)}
                subtitle="Unpaid installments across active batches"
                icon={AlertTriangle}
                variant="amber"
              />

              <StatCard
                title="Foreman Commission Earned"
                value={formatINR(stats.financials.foremanCommissionEarned)}
                subtitle={`${stats.financials.auctionsConducted} auctions held to date`}
                icon={Receipt}
                variant="navy"
              />
            </div>

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
                  to="/collect"
                  className="text-xs text-teal-700 hover:text-teal-800 font-semibold flex items-center gap-1"
                >
                  <span>New Entry</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              {stats.recentCollections.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No collection entries recorded yet. Tap "Collect Money" to record your first receipt.
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

            {/* Upcoming Batch Auctions */}
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
