import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Search,
  IndianRupee,
  Smartphone,
  Building,
  Receipt,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { collectionsApi } from '../api/collections';
import { TopHeader } from '../components/layout/TopHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatINR, formatDateTime } from '../utils/formatters';

type QuickDate = 'TODAY' | 'YESTERDAY' | 'THIS_MONTH' | 'ALL';

export const PaymentRegisterPage: React.FC = () => {
  const [quickDate, setQuickDate] = useState<QuickDate>('THIS_MONTH');
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'REVERSED'>('ALL');

  const getDateRange = () => {
    const now = new Date();
    if (quickDate === 'TODAY') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
      return { startDate: start, endDate: end };
    }
    if (quickDate === 'YESTERDAY') {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      const start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0).toISOString();
      const end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999).toISOString();
      return { startDate: start, endDate: end };
    }
    if (quickDate === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
      return { startDate: start, endDate: end };
    }
    return { startDate: undefined, endDate: undefined };
  };

  const { startDate, endDate } = getDateRange();

  const { data: registerData, isLoading, error } = useQuery({
    queryKey: ['collectionsRegister', startDate, endDate, modeFilter, search],
    queryFn: () =>
      collectionsApi.getAll({
        startDate,
        endDate,
        paymentMode: modeFilter === 'ALL' ? undefined : modeFilter,
        search: search.trim() || undefined,
      }),
  });

  const totals = registerData?.totals || {
    count: 0,
    cashTotal: 0,
    upiTotal: 0,
    bankTotal: 0,
    chequeTotal: 0,
    grandTotal: 0,
  };

  const payments = (registerData?.payments || []).filter((p) => {
    if (statusFilter === 'ACTIVE') return !p.isReversed;
    if (statusFilter === 'REVERSED') return p.isReversed;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <TopHeader
        title="Collections Register"
        subtitle="Daily Ledger & Payment Receipts"
        rightAction={
          <Link
            to="/collect"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors shadow-xs touch-target"
          >
            <IndianRupee size={15} />
            <span>New Collection</span>
          </Link>
        }
      />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Method Breakdown KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Recorded
            </span>
            <div className="text-base sm:text-lg font-black text-slate-900 tabular-nums mt-0.5">
              {formatINR(totals.grandTotal)}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              {totals.count} valid receipts
            </span>
          </div>

          <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 shadow-2xs">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
              <IndianRupee size={12} />
              <span>Cash Total</span>
            </span>
            <div className="text-base sm:text-lg font-black text-emerald-950 tabular-nums mt-0.5">
              {formatINR(totals.cashTotal)}
            </div>
            <span className="text-[10px] text-emerald-700 font-medium">Physical cash in hand</span>
          </div>

          <div className="bg-sky-50/60 p-3 rounded-xl border border-sky-200 shadow-2xs">
            <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block flex items-center gap-1">
              <Smartphone size={12} />
              <span>UPI Total</span>
            </span>
            <div className="text-base sm:text-lg font-black text-sky-950 tabular-nums mt-0.5">
              {formatINR(totals.upiTotal)}
            </div>
            <span className="text-[10px] text-sky-700 font-medium">PhonePe / GPay / Paytm</span>
          </div>

          <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-200 shadow-2xs">
            <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block flex items-center gap-1">
              <Building size={12} />
              <span>Bank Transfers</span>
            </span>
            <div className="text-base sm:text-lg font-black text-indigo-950 tabular-nums mt-0.5">
              {formatINR(totals.bankTotal)}
            </div>
            <span className="text-[10px] text-indigo-700 font-medium">IMPS / NEFT / Cheques</span>
          </div>
        </div>

        {/* Accounting Separation Notice */}
        <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600 leading-snug flex items-center gap-2">
          <Clock size={14} className="text-slate-500 shrink-0" />
          <span>
            <strong>Ledger Rule:</strong> Collection totals represent member installment receipts only. They are accounted separately from business expenses, auction commissions, and prize payouts, and are not classified as profit.
          </span>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-3">
          {/* Quick Date Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {(
              [
                { id: 'TODAY', label: 'Today' },
                { id: 'YESTERDAY', label: 'Yesterday' },
                { id: 'THIS_MONTH', label: 'This Month' },
                { id: 'ALL', label: 'All Time' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setQuickDate(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  quickDate === tab.id
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar & Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={15} />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Receipt #, Customer, Phone..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
              >
                <option value="ALL">All Payment Methods</option>
                <option value="CASH">Cash Only</option>
                <option value="UPI">UPI Only</option>
                <option value="BANK_TRANSFER">Bank Transfer Only</option>
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Receipts Only</option>
                <option value="REVERSED">Reversed Receipts Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payments Table / Cards List */}
        {isLoading ? (
          <LoadingSpinner message="Loading daily collection register..." />
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
            Failed to load collection register.
          </div>
        ) : payments.length > 0 ? (
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1">
              Showing {payments.length} transactions
            </div>

            {payments.map((p) => (
              <Link
                key={p.id}
                to={`/receipts/${p.id}`}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all block shadow-2xs ${
                  p.isReversed
                    ? 'bg-red-50/40 border-red-200 hover:border-red-300'
                    : 'bg-white border-slate-200 hover:border-teal-300'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 truncate">
                      {p.customer?.fullName}
                    </span>
                    <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {p.customer?.customerCode}
                    </span>
                    {p.isReversed && (
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-red-100 text-red-700 uppercase">
                        Reversed
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-slate-600">{p.receiptNumber}</span>
                    <span>•</span>
                    <span>{formatDateTime(p.paymentDate)}</span>
                    <span>•</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-teal-50 text-teal-800 uppercase">
                      {p.paymentMode}
                    </span>
                    {p.transactionRef && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        Ref: {p.transactionRef}
                      </span>
                    )}
                  </div>

                  {p.isReversed && p.reversalReason && (
                    <div className="text-[11px] text-red-700 mt-1 italic">
                      Reversal reason: "{p.reversalReason}"
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <div
                    className={`text-sm font-black tabular-nums ${
                      p.isReversed ? 'text-red-700 line-through' : 'text-teal-900'
                    }`}
                  >
                    +{formatINR(p.amount)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-end gap-1">
                    <span>Receipt</span>
                    <ArrowUpRight size={12} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
            <Receipt size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-600 font-medium">No collection receipts match filters</p>
            <p className="text-xs text-slate-400 mt-1">Try broadening your date range or search terms.</p>
          </div>
        )}
      </div>
    </div>
  );
};
