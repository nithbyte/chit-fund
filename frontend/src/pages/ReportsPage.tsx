import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Printer,
  Download,
  Calendar,
  Users,
  Layers,
  RotateCcw,
  BookOpen,
  Search,
  AlertTriangle,
} from 'lucide-react';
import { reportsApi } from '../api/reports';
import { customersApi } from '../api/customers';
import { TopHeader } from '../components/layout/TopHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatINR, formatDate } from '../utils/formatters';

type ReportTab = 'collections' | 'outstanding' | 'schemes' | 'reversals' | 'statement';

// Prevent CSV formula injection
const sanitizeCsvCell = (val: any): string => {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
};

const downloadCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const headerLine = headers.map(sanitizeCsvCell).join(',');
  const rowLines = rows.map((r) => r.map(sanitizeCsvCell).join(',')).join('\n');
  const csvContent = `\uFEFF${headerLine}\n${rowLines}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const ReportsPage: React.FC = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [activeTab, setActiveTab] = useState<ReportTab>('collections');

  // Filters for Collections tab
  const [collectionDate, setCollectionDate] = useState(todayStr);

  // Filters for Statement tab
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  // Queries
  const { data: dailyReport, isLoading: isDailyLoading } = useQuery({
    queryKey: ['reportDaily', collectionDate],
    queryFn: () => reportsApi.getDailyCollection(collectionDate),
    enabled: activeTab === 'collections',
  });

  const { data: outstandingReport, isLoading: isOutstandingLoading } = useQuery({
    queryKey: ['reportOutstanding'],
    queryFn: reportsApi.getCustomerOutstanding,
    enabled: activeTab === 'outstanding',
  });

  const { data: schemesReport, isLoading: isSchemesLoading } = useQuery({
    queryKey: ['reportSchemes'],
    queryFn: reportsApi.getGroupWise,
    enabled: activeTab === 'schemes',
  });

  const { data: reversalsReport, isLoading: isReversalsLoading } = useQuery({
    queryKey: ['reportReversals'],
    queryFn: () => reportsApi.getReversals(),
    enabled: activeTab === 'reversals',
  });

  const { data: customersData } = useQuery({
    queryKey: ['customersList'],
    queryFn: () => customersApi.getAll({ limit: 100 }),
    enabled: activeTab === 'statement',
  });

  const { data: statementReport, isLoading: isStatementLoading } = useQuery({
    queryKey: ['reportStatement', selectedCustomerId],
    queryFn: () => reportsApi.getCustomerStatement(selectedCustomerId),
    enabled: activeTab === 'statement' && !!selectedCustomerId,
  });

  const handlePrint = () => {
    window.print();
  };

  // CSV Export handlers
  const exportCollectionsCsv = () => {
    if (!dailyReport?.items) return;
    const headers = ['Receipt #', 'Date', 'Customer Code', 'Customer Name', 'Phone', 'Amount (INR)', 'Mode', 'Ref', 'Reversed'];
    const rows = dailyReport.items.map((i) => [
      i.receiptNumber,
      i.paymentDate,
      i.customerCode,
      i.customerName,
      i.phone,
      i.amount,
      i.paymentMode,
      i.transactionRef || '',
      i.isReversed ? 'YES' : 'NO',
    ]);
    downloadCsv(`Daily_Collections_${collectionDate}.csv`, headers, rows);
  };

  const exportOutstandingCsv = () => {
    if (!outstandingReport?.items) return;
    const headers = ['Customer Code', 'Name', 'Phone', 'Active Chits', 'Total Due (INR)', 'Overdue Installments', 'Overdue Amount (INR)'];
    const rows = outstandingReport.items.map((i) => [
      i.customerCode,
      i.fullName,
      i.phone,
      i.activeChitsCount,
      i.totalDue,
      i.overdueCount,
      i.overdueAmount,
    ]);
    downloadCsv(`Customer_Outstanding_${todayStr}.csv`, headers, rows);
  };

  const exportSchemesCsv = () => {
    if (!schemesReport) return;
    const headers = ['Group Code', 'Name', 'Type', 'Pool Value', 'Current Month', 'Total Months', 'Members', 'Expected (INR)', 'Collected (INR)', 'Pending (INR)', 'Efficiency %'];
    const rows = schemesReport.map((g) => [
      g.groupCode,
      g.name,
      g.chitType,
      g.totalValue,
      g.currentMonth,
      g.totalMonths,
      g.enrolledMembers,
      g.totalInstallmentExpected,
      g.totalCollected,
      g.totalPending,
      g.collectionEfficiency,
    ]);
    downloadCsv(`Scheme_Portfolio_${todayStr}.csv`, headers, rows);
  };

  const exportStatementCsv = () => {
    if (!statementReport) return;
    const headers = ['Receipt #', 'Date', 'Amount (INR)', 'Mode', 'Ref', 'Allocations', 'Status'];
    const rows = statementReport.ledgerTransactions.map((tx) => [
      tx.receiptNumber,
      tx.date,
      tx.amount,
      tx.paymentMode,
      tx.transactionRef || '',
      tx.allocations.map((a) => `${a.groupCode}-M${a.monthNumber}: ₹${a.allocatedAmount}`).join('; '),
      tx.isReversed ? 'REVERSED' : 'COMMITTED',
    ]);
    downloadCsv(`Statement_${statementReport.customer.customerCode}.csv`, headers, rows);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <TopHeader
        title="Financial & Operational Reports"
        subtitle="Auditable Statements, Outstanding Dues & Portfolio Ledgers"
        rightAction={
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs touch-target"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">Print View</span>
            </button>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200">
          <button
            onClick={() => setActiveTab('collections')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === 'collections'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar size={15} />
            <span>Daily Collections</span>
          </button>

          <button
            onClick={() => setActiveTab('outstanding')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === 'outstanding'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users size={15} />
            <span>Customer Outstanding</span>
          </button>

          <button
            onClick={() => setActiveTab('schemes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === 'schemes'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers size={15} />
            <span>Scheme Efficiency</span>
          </button>

          <button
            onClick={() => setActiveTab('reversals')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === 'reversals'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <RotateCcw size={15} />
            <span>Reversals Register</span>
          </button>

          <button
            onClick={() => setActiveTab('statement')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === 'statement'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen size={15} />
            <span>Customer Statement</span>
          </button>
        </div>

        {/* TAB 1: DAILY COLLECTIONS */}
        {activeTab === 'collections' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-semibold">Report Date:</span>
                <input
                  type="date"
                  value={collectionDate}
                  onChange={(e) => setCollectionDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-800 font-bold text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <button
                onClick={exportCollectionsCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 font-bold hover:bg-teal-100 transition-colors"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            </div>

            {isDailyLoading ? (
              <LoadingSpinner message="Calculating daily collections..." />
            ) : dailyReport ? (
              <>
                {/* Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                      Valid Collections
                    </span>
                    <span className="text-xl font-black text-teal-950 tabular-nums">
                      {formatINR(dailyReport.summary.validTotal)}
                    </span>
                    <span className="text-[10px] text-teal-700 block mt-0.5">
                      {dailyReport.summary.validReceipts} valid receipts
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                      Cash Received
                    </span>
                    <span className="text-xl font-black text-slate-900 tabular-nums">
                      {formatINR(dailyReport.summary.cashTotal)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Physical cash drawer</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                      UPI Collections
                    </span>
                    <span className="text-xl font-black text-slate-900 tabular-nums">
                      {formatINR(dailyReport.summary.upiTotal)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">PhonePe / GPay / QR</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                      Bank Transfers
                    </span>
                    <span className="text-xl font-black text-slate-900 tabular-nums">
                      {formatINR(dailyReport.summary.bankTotal)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">IMPS / NEFT / Direct</span>
                  </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Receipt #</th>
                          <th className="py-2.5 px-3">Time</th>
                          <th className="py-2.5 px-3">Customer</th>
                          <th className="py-2.5 px-3">Phone</th>
                          <th className="py-2.5 px-3">Mode</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                        {dailyReport.items.map((item) => (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-50 ${
                              item.isReversed ? 'bg-red-50/40 text-slate-400 line-through' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                              {item.receiptNumber}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {new Date(item.paymentDate).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'Asia/Kolkata',
                              })}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {item.customerName} ({item.customerCode})
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 font-mono">{item.phone}</td>
                            <td className="py-2.5 px-3">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                {item.paymentMode}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-teal-900 tabular-nums">
                              {formatINR(item.amount)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {item.isReversed ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                  REVERSED
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                  CONFIRMED
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* TAB 2: CUSTOMER OUTSTANDING */}
        {activeTab === 'outstanding' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Audited ledger balances for all customer accounts across active chits.
              </div>
              <button
                onClick={exportOutstandingCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 font-bold hover:bg-teal-100 transition-colors text-xs"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            </div>

            {isOutstandingLoading ? (
              <LoadingSpinner message="Calculating active customer balances..." />
            ) : outstandingReport ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                      Enrolled Customers
                    </span>
                    <span className="text-xl font-black text-slate-900 tabular-nums">
                      {outstandingReport.summary.totalCustomers}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">With active memberships</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                      Portfolio Total Due
                    </span>
                    <span className="text-xl font-black text-slate-900 tabular-nums">
                      {formatINR(outstandingReport.summary.portfolioTotalDue)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Total pending ledger balance</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/30 shadow-xs">
                    <span className="text-[11px] font-semibold text-rose-800 uppercase block">
                      Critical Overdue Dues
                    </span>
                    <span className="text-xl font-black text-rose-700 tabular-nums">
                      {formatINR(outstandingReport.summary.portfolioOverdue)}
                    </span>
                    <span className="text-[10px] text-rose-600 block mt-0.5">Past due payment dates</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Code</th>
                          <th className="py-2.5 px-3">Customer Name</th>
                          <th className="py-2.5 px-3">Phone</th>
                          <th className="py-2.5 px-3 text-center">Active Chits</th>
                          <th className="py-2.5 px-3 text-right">Total Due</th>
                          <th className="py-2.5 px-3 text-right">Overdue Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                        {outstandingReport.items.map((cust) => (
                          <tr key={cust.customerId} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                              {cust.customerCode}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {cust.fullName}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 font-mono">{cust.phone}</td>
                            <td className="py-2.5 px-3 text-center font-bold">
                              {cust.activeChitsCount}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                              {formatINR(cust.totalDue)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-rose-700 tabular-nums">
                              {cust.overdueAmount > 0 ? (
                                <span className="inline-flex items-center gap-1">
                                  <AlertTriangle size={12} className="text-rose-500" />
                                  <span>{formatINR(cust.overdueAmount)}</span>
                                  <span className="text-[10px] font-normal text-rose-500">
                                    ({cust.overdueCount} mos)
                                  </span>
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-medium">₹0 (On Track)</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* TAB 3: SCHEME-WISE EFFICIENCY */}
        {activeTab === 'schemes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Collection recovery percentage and active month progress for all chit batches.
              </div>
              <button
                onClick={exportSchemesCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 font-bold hover:bg-teal-100 transition-colors text-xs"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            </div>

            {isSchemesLoading ? (
              <LoadingSpinner message="Calculating scheme collection rates..." />
            ) : schemesReport ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Scheme</th>
                        <th className="py-2.5 px-3">Pool Value</th>
                        <th className="py-2.5 px-3">Progress</th>
                        <th className="py-2.5 px-3 text-right">Expected</th>
                        <th className="py-2.5 px-3 text-right">Collected</th>
                        <th className="py-2.5 px-3 text-right">Pending</th>
                        <th className="py-2.5 px-3 text-center">Efficiency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {schemesReport.map((grp) => (
                        <tr key={grp.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            <div>{grp.name}</div>
                            <span className="text-[10px] font-mono text-slate-500">
                              {grp.groupCode} • {grp.chitType}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold tabular-nums">
                            {formatINR(grp.totalValue)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            Month {grp.currentMonth} of {grp.totalMonths}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-slate-700">
                            {formatINR(grp.totalInstallmentExpected)}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-bold text-teal-800">
                            {formatINR(grp.totalCollected)}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-bold text-rose-700">
                            {formatINR(grp.totalPending)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                                grp.collectionEfficiency >= 90
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : grp.collectionEfficiency >= 75
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {grp.collectionEfficiency}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* TAB 4: REVERSALS REGISTER */}
        {activeTab === 'reversals' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-500">
              Compensating audit entries for cancelled or reversed collections.
            </div>

            {isReversalsLoading ? (
              <LoadingSpinner message="Loading reversals audit..." />
            ) : reversalsReport ? (
              <>
                <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-rose-800 uppercase block">
                      Total Compensated Reversals
                    </span>
                    <span className="text-2xl font-black text-rose-700 tabular-nums">
                      {formatINR(reversalsReport.totalReversedAmount)}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-rose-700 px-2.5 py-1 rounded-lg bg-rose-100/70">
                    {reversalsReport.count} payments reversed
                  </span>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Receipt #</th>
                          <th className="py-2.5 px-3">Reversed At</th>
                          <th className="py-2.5 px-3">Customer</th>
                          <th className="py-2.5 px-3">Mode</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                          <th className="py-2.5 px-3">Reason / Auditor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                        {reversalsReport.items.map((rev) => (
                          <tr key={rev.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                              {rev.receiptNumber}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {new Date(rev.reversedAt).toLocaleString('en-IN', {
                                timeZone: 'Asia/Kolkata',
                              })}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {rev.customerName} ({rev.customerCode})
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px]">{rev.paymentMode}</td>
                            <td className="py-2.5 px-3 text-right font-black text-rose-700 tabular-nums">
                              {formatINR(rev.amount)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              <div>{rev.reversalReason || 'No reason specified'}</div>
                              <span className="text-[10px] text-slate-400">By {rev.receivedBy}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* TAB 5: CUSTOMER STATEMENT */}
        {activeTab === 'statement' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <Search size={15} className="text-slate-400" />
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-800 font-medium text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="">-- Select Customer for Statement --</option>
                  {customersData?.items?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.customerCode}) - {c.phone}
                    </option>
                  ))}
                </select>
              </div>

              {statementReport && (
                <button
                  onClick={exportStatementCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 font-bold hover:bg-teal-100 transition-colors"
                >
                  <Download size={14} />
                  <span>Export Statement CSV</span>
                </button>
              )}
            </div>

            {!selectedCustomerId ? (
              <div className="p-12 text-center text-slate-500 text-xs bg-white rounded-xl border border-slate-200">
                <BookOpen size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700">Please select a customer above</p>
                <p className="text-slate-400 text-[11px] mt-1">
                  View full passbook history, installment ledger, and allocated receipts.
                </p>
              </div>
            ) : isStatementLoading ? (
              <LoadingSpinner message="Generating customer passbook statement..." />
            ) : statementReport ? (
              <div className="space-y-4 print:p-0">
                {/* Printable Header */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-base font-black text-slate-900">
                        {statementReport.customer.fullName}
                      </h2>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        Customer Code: <span className="font-mono font-bold text-teal-800">{statementReport.customer.customerCode}</span> • Phone: {statementReport.customer.phone}
                      </div>
                      {statementReport.customer.address && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {statementReport.customer.address}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                        Net Balance Due
                      </span>
                      <span className="text-2xl font-black text-slate-900 tabular-nums">
                        {formatINR(statementReport.summary.currentBalanceDue)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-1 text-center text-xs">
                    <div className="p-2 rounded-lg bg-slate-50">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Total Payable To Date
                      </span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {formatINR(statementReport.summary.totalPayableToDate)}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50">
                      <span className="text-[10px] text-emerald-700 uppercase font-semibold block">
                        Total Amount Paid
                      </span>
                      <span className="font-bold text-emerald-900 tabular-nums">
                        {formatINR(statementReport.summary.totalPaid)}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-teal-50">
                      <span className="text-[10px] text-teal-700 uppercase font-semibold block">
                        Chit Memberships
                      </span>
                      <span className="font-bold text-teal-900">
                        {statementReport.memberships.length} active slots
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ledger Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-3 bg-slate-100/60 border-b border-slate-200">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Passbook Transaction History
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Receipt #</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Payment Mode</th>
                          <th className="py-2.5 px-3">Installment Allocations</th>
                          <th className="py-2.5 px-3 text-right">Amount Paid</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                        {statementReport.ledgerTransactions.map((tx) => (
                          <tr
                            key={tx.id}
                            className={`hover:bg-slate-50 ${
                              tx.isReversed ? 'bg-red-50/40 text-slate-400 line-through' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                              {tx.receiptNumber}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">{formatDate(tx.date)}</td>
                            <td className="py-2.5 px-3">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                {tx.paymentMode}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-wrap gap-1">
                                {tx.allocations.map((a, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200"
                                  >
                                    {a.groupCode}-M{a.monthNumber}: {formatINR(a.allocatedAmount)}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-teal-900 tabular-nums">
                              {formatINR(tx.amount)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {tx.isReversed ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                  REVERSED
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                  COMMITTED
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
