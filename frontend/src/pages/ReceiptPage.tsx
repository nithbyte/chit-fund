import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Printer,
  AlertTriangle,
  RotateCcw,
  X,
  Loader2,
} from 'lucide-react';
import { collectionsApi } from '../api/collections';
import { TopHeader } from '../components/layout/TopHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatINR, formatDateTime, formatPhone } from '../utils/formatters';

export const ReceiptPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);
  const [reversalReason, setReversalReason] = useState('');
  const [reversalError, setReversalError] = useState<string | null>(null);

  const { data: receipt, isLoading, error } = useQuery({
    queryKey: ['receipt', id],
    queryFn: () => collectionsApi.getById(id!),
    enabled: !!id,
  });

  const reverseMutation = useMutation({
    mutationFn: (reason: string) => collectionsApi.reverse(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipt', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setIsReverseModalOpen(false);
      setReversalReason('');
    },
    onError: (err: any) => {
      setReversalError(err.message || 'Failed to reverse receipt');
    },
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopHeader title="Payment Receipt" showBack backPath="/dashboard" />
        <LoadingSpinner message="Generating official receipt..." />
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopHeader title="Payment Receipt" showBack backPath="/dashboard" />
        <div className="max-w-md mx-auto p-4 mt-8 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
          Receipt not found.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* App Header (Hidden during print) */}
      <div className="print:hidden">
        <TopHeader
          title="Payment Receipt"
          subtitle={receipt.receiptNumber}
          showBack
          backPath="/dashboard"
          rightAction={
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors shadow-xs touch-target"
              >
                <Printer size={15} />
                <span>Print</span>
              </button>
            </div>
          }
        />
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 print:p-0 print:max-w-none">
        {/* Receipt Container */}
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 print:border-none print:shadow-none print:p-8 relative overflow-hidden">
          {/* Watermark if reversed */}
          {receipt.isReversed && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-15 rotate-[-25deg] select-none">
              <span className="text-6xl sm:text-7xl font-black text-red-600 border-8 border-red-600 px-6 py-2 rounded-2xl tracking-widest uppercase">
                REVERSED
              </span>
            </div>
          )}

          {/* Top Brand Banner */}
          <div className="text-center border-b-2 border-slate-900 pb-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-teal-700 text-white font-black text-sm flex items-center justify-center">
                D
              </div>
              <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase">
                Durga Chit Fund
              </h1>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Small Chit Savings & Collections • Guntur, Andhra Pradesh
            </p>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              Proprietor: Durga Devi • Contact: +91 98480 11223
            </p>
            <div className="inline-block mt-2 px-3 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-[11px] font-bold text-slate-800 tracking-wider uppercase">
              Official Collection Receipt
            </div>
          </div>

          {/* Receipt Meta Details */}
          <div className="grid grid-cols-2 gap-3 py-4 border-b border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Receipt Number</span>
              <span className="font-mono font-bold text-slate-950 text-sm">
                {receipt.receiptNumber}
              </span>
            </div>

            <div className="text-right">
              <span className="text-slate-500 block text-[11px]">Payment Date & Time</span>
              <span className="font-medium text-slate-900">
                {formatDateTime(receipt.paymentDate)}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Received From</span>
              <span className="font-bold text-slate-950 text-sm">
                {receipt.customer?.fullName}
              </span>
              <span className="text-slate-500 block text-[11px]">
                {receipt.customer?.customerCode} • {formatPhone(receipt.customer?.phone)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-slate-500 block text-[11px]">Payment Mode</span>
              <span className="font-bold text-teal-800 uppercase px-2 py-0.5 rounded bg-teal-50 border border-teal-200 inline-block mt-0.5">
                {receipt.paymentMode}
              </span>
              {receipt.transactionRef && (
                <span className="text-[10px] text-slate-500 block mt-1 font-mono">
                  Ref: {receipt.transactionRef}
                </span>
              )}
            </div>
          </div>

          {/* Itemized Installment Allocation Breakdown */}
          <div className="py-4 border-b border-slate-200">
            <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              Installment Allocation Breakdown
            </h4>
            <div className="space-y-2">
              {receipt.allocations?.map((alloc: any) => (
                <div
                  key={alloc.id}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900">
                      {alloc.installment?.chitGroup?.name || 'Chit Installment'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Ticket #{alloc.membership?.ticketNumber} • Month {alloc.installment?.monthNumber}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-slate-900 tabular-nums text-sm">
                      {formatINR(alloc.allocatedAmount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Amount in INR */}
          <div className="py-4 border-b-2 border-slate-900 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Total Amount Received
              </span>
              <span className="text-[11px] text-slate-500 italic">
                Manual collection recorded in ledger
              </span>
            </div>

            <div className="text-2xl font-black text-slate-950 tabular-nums">
              {formatINR(receipt.amount)}
            </div>
          </div>

          {/* Signature & Note Footer */}
          <div className="pt-6 grid grid-cols-2 gap-4 text-xs">
            <div>
              {receipt.notes && (
                <p className="text-[11px] text-slate-500 italic">
                  Note: "{receipt.notes}"
                </p>
              )}
              {receipt.isReversed && (
                <div className="mt-2 p-2 rounded bg-red-50 border border-red-200 text-[11px] text-red-800">
                  <strong>Reversal Reason:</strong> {receipt.reversalReason}
                  <div className="text-[10px] text-red-600 mt-0.5">
                    Reversed on {formatDateTime(receipt.reversedAt)}
                  </div>
                </div>
              )}
            </div>

            <div className="text-right flex flex-col items-end justify-end">
              <div className="font-semibold text-slate-900 text-xs border-t border-slate-400 pt-1 w-32 text-center">
                Durga Devi
              </div>
              <span className="text-[10px] text-slate-500 w-32 text-center">
                Authorized Signature
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls for Durga (Hidden in Print) */}
        <div className="mt-4 flex items-center justify-between gap-3 print:hidden">
          <Link
            to="/collect"
            className="flex-1 py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors touch-target"
          >
            <span>Record Next Collection</span>
          </Link>

          {!receipt.isReversed && (
            <button
              onClick={() => setIsReverseModalOpen(true)}
              className="py-3 px-4 rounded-xl bg-white hover:bg-red-50 text-red-700 border border-red-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors touch-target"
            >
              <RotateCcw size={14} />
              <span>Reverse Receipt</span>
            </button>
          )}
        </div>
      </div>

      {/* Reversal Confirmation Modal */}
      {isReverseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle size={18} />
                <h3 className="text-base font-bold text-slate-900">Reverse Payment Receipt</h3>
              </div>
              <button
                onClick={() => setIsReverseModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              Financial records are <strong>never deleted</strong>. Reversing this receipt will mark it as reversed, revert installment allocations, and record an audit trail entry.
            </p>

            {reversalError && (
              <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {reversalError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setReversalError(null);
                reverseMutation.mutate(reversalReason);
              }}
              className="space-y-3 mt-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Reversal Reason *
                </label>
                <textarea
                  required
                  rows={2}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g. Duplicate receipt recorded by mistake / customer cheque returned"
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReverseModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reverseMutation.isPending || reversalReason.trim().length < 5}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {reverseMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  <span>Confirm Reversal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
