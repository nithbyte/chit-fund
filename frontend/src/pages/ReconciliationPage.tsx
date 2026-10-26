import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  IndianRupee,
  Smartphone,
  Building,
  CheckCircle2,
  AlertTriangle,
  Save,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import { reconciliationApi } from '../api/reconciliation';
import type { SaveReconciliationPayload } from '../api/reconciliation';
import { TopHeader } from '../components/layout/TopHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatINR, formatDateTime } from '../utils/formatters';

export const ReconciliationPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [actualCash, setActualCash] = useState<string>('');
  const [actualUpi, setActualUpi] = useState<string>('');
  const [actualBank, setActualBank] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['dailyReconciliation', selectedDate],
    queryFn: () => reconciliationApi.getDailyReport(selectedDate),
  });

  useEffect(() => {
    if (report && report.actuals) {
      setActualCash(report.actuals.actualCashCounted !== null ? String(report.actuals.actualCashCounted) : '');
      setActualUpi(report.actuals.actualUpiVerified !== null ? String(report.actuals.actualUpiVerified) : '');
      setActualBank(report.actuals.actualBankVerified !== null ? String(report.actuals.actualBankVerified) : '');
      setNote(report.actuals.discrepancyNote || '');
    } else {
      setActualCash('');
      setActualUpi('');
      setActualBank('');
      setNote('');
    }
  }, [report]);

  const saveMutation = useMutation({
    mutationFn: (payload: SaveReconciliationPayload) => reconciliationApi.saveDaily(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyReconciliation', selectedDate] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      date: selectedDate,
      actualCashCounted: actualCash !== '' ? Number(actualCash) : undefined,
      actualUpiVerified: actualUpi !== '' ? Number(actualUpi) : undefined,
      actualBankVerified: actualBank !== '' ? Number(actualBank) : undefined,
      discrepancyNote: note.trim() || undefined,
    });
  };

  const sysCash = report?.systemTotals.systemCashTotal || 0;
  const sysUpi = report?.systemTotals.systemUpiTotal || 0;
  const sysBank = report?.systemTotals.systemBankTotal || 0;
  const sysGrand = report?.systemTotals.systemTotal || 0;

  const numCash = actualCash !== '' ? Number(actualCash) : null;
  const numUpi = actualUpi !== '' ? Number(actualUpi) : null;
  const numBank = actualBank !== '' ? Number(actualBank) : null;

  const diffCash = numCash !== null ? numCash - sysCash : null;
  const diffUpi = numUpi !== null ? numUpi - sysUpi : null;
  const diffBank = numBank !== null ? numBank - sysBank : null;

  const totalActual =
    (numCash !== null ? numCash : 0) +
    (numUpi !== null ? numUpi : 0) +
    (numBank !== null ? numBank : 0);
  const totalDiff =
    numCash !== null || numUpi !== null || numBank !== null
      ? totalActual - sysGrand
      : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <TopHeader
        title="Daily Reconciliation"
        subtitle="Compare Software Records with Physical Cash & Statements"
        showBack
        backPath="/dashboard"
      />

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Date Selector Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-teal-700" />
            <div>
              <span className="text-xs font-bold text-slate-900 block">Reconciliation Date</span>
              <span className="text-[11px] text-slate-500">Select date to verify ledger against physical assets</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white"
            />
            <button
              type="button"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200"
            >
              Today
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span className="font-semibold">Reconciliation record for {selectedDate} saved successfully!</span>
          </div>
        )}

        {isLoading ? (
          <LoadingSpinner message="Calculating daily ledger totals and actuals..." />
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
            Failed to load reconciliation for {selectedDate}.
          </div>
        ) : report ? (
          <form onSubmit={handleSave} className="space-y-4">
            {/* Status Indicator Banner */}
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-2xs ${
                report.actuals.status === 'RECONCILED'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : report.actuals.status === 'DISCREPANCY'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-slate-100 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {report.actuals.status === 'RECONCILED' ? (
                  <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
                ) : report.actuals.status === 'DISCREPANCY' ? (
                  <AlertTriangle size={22} className="text-amber-600 shrink-0" />
                ) : (
                  <FileSpreadsheet size={22} className="text-slate-500 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-black uppercase tracking-wider">
                    Status: {report.actuals.status}
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {report.actuals.reconciledAt
                      ? `Reconciled by ${report.actuals.reconciledBy || 'Durga'} on ${formatDateTime(report.actuals.reconciledAt)}`
                      : 'Pending physical verification by owner Durga'}
                  </div>
                </div>
              </div>

              {totalDiff !== null && (
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
                    Net Variance
                  </span>
                  <span
                    className={`text-sm font-black tabular-nums ${
                      Math.abs(totalDiff) < 0.01
                        ? 'text-emerald-700'
                        : totalDiff > 0
                        ? 'text-blue-700'
                        : 'text-red-700'
                    }`}
                  >
                    {totalDiff > 0 ? `+${formatINR(totalDiff)} (Surplus)` : totalDiff < 0 ? `${formatINR(totalDiff)} (Deficit)` : '₹0.00 (Balanced)'}
                  </span>
                </div>
              )}
            </div>

            {/* Reconciliation Comparison Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-4 py-3 bg-slate-100/60 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                Daily Verification Channels
              </div>

              <div className="divide-y divide-slate-100 p-2 sm:p-4 space-y-3">
                {/* 1. Physical Cash Verification */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                      <IndianRupee size={14} className="text-emerald-700" />
                      <span>Physical Cash Drawer</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      System Cash Recorded: <strong className="text-slate-900">{formatINR(sysCash)}</strong>
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Actual Cash Counted (₹)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={actualCash}
                      onChange={(e) => setActualCash(e.target.value)}
                      placeholder={String(sysCash)}
                      className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[10px] text-slate-400 block font-semibold">Cash Variance</span>
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        diffCash === null
                          ? 'text-slate-400'
                          : Math.abs(diffCash) < 0.01
                          ? 'text-emerald-600'
                          : diffCash > 0
                          ? 'text-sky-600'
                          : 'text-red-600'
                      }`}
                    >
                      {diffCash === null
                        ? 'Not entered'
                        : diffCash === 0
                        ? 'Matched (₹0)'
                        : diffCash > 0
                        ? `+${formatINR(diffCash)}`
                        : formatINR(diffCash)}
                    </span>
                  </div>
                </div>

                {/* 2. UPI App Statements */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                      <Smartphone size={14} className="text-sky-700" />
                      <span>UPI Business App</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      System UPI Recorded: <strong className="text-slate-900">{formatINR(sysUpi)}</strong>
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Actual UPI Verified (₹)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={actualUpi}
                      onChange={(e) => setActualUpi(e.target.value)}
                      placeholder={String(sysUpi)}
                      className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[10px] text-slate-400 block font-semibold">UPI Variance</span>
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        diffUpi === null
                          ? 'text-slate-400'
                          : Math.abs(diffUpi) < 0.01
                          ? 'text-emerald-600'
                          : diffUpi > 0
                          ? 'text-sky-600'
                          : 'text-red-600'
                      }`}
                    >
                      {diffUpi === null
                        ? 'Not entered'
                        : diffUpi === 0
                        ? 'Matched (₹0)'
                        : diffUpi > 0
                        ? `+${formatINR(diffUpi)}`
                        : formatINR(diffUpi)}
                    </span>
                  </div>
                </div>

                {/* 3. Bank Statement */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                      <Building size={14} className="text-indigo-700" />
                      <span>Bank Statement (IMPS/NEFT)</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      System Bank Recorded: <strong className="text-slate-900">{formatINR(sysBank)}</strong>
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Actual Bank Verified (₹)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={actualBank}
                      onChange={(e) => setActualBank(e.target.value)}
                      placeholder={String(sysBank)}
                      className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[10px] text-slate-400 block font-semibold">Bank Variance</span>
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        diffBank === null
                          ? 'text-slate-400'
                          : Math.abs(diffBank) < 0.01
                          ? 'text-emerald-600'
                          : diffBank > 0
                          ? 'text-sky-600'
                          : 'text-red-600'
                      }`}
                    >
                      {diffBank === null
                        ? 'Not entered'
                        : diffBank === 0
                        ? 'Matched (₹0)'
                        : diffBank > 0
                        ? `+${formatINR(diffBank)}`
                        : formatINR(diffBank)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Discrepancy Note & Actions */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reconciliation Notes & Discrepancy Explanation
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Cash in drawer matches exactly; ₹500 UPI transfer was credited after 10 PM and will reflect tomorrow."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="w-full py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors touch-target"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving Daily Reconciliation...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Daily Reconciliation Record</span>
                  </>
                )}
              </button>
            </div>

            {/* List of Today's Transactions Recorded */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Ledger Entries for {selectedDate} ({report.transactions.length})
              </h3>

              {report.transactions.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No collections recorded for this date.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {report.transactions.map((tx) => (
                    <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{tx.customerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {tx.receiptNumber} • {tx.paymentMode} {tx.transactionRef ? `• Ref: ${tx.transactionRef}` : ''}
                        </div>
                      </div>
                      <div className="font-black text-teal-800 tabular-nums">
                        +{formatINR(tx.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
};
