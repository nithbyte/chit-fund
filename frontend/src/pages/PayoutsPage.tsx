import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { TopHeader } from '../components/layout/TopHeader';
import { formatINR, formatDate } from '../utils/formatters';

export const PayoutsPage: React.FC = () => {
  const mockPayouts = [
    {
      id: 'pay-001',
      voucherNumber: 'PAY-202609-0001',
      groupName: '₹1 Lakh 20-Month Auction Chit (Batch A)',
      groupCode: 'CF-100K-20M-A',
      winnerName: 'Lakshmi Narayana Rao',
      ticketNumber: 2,
      grossPrize: 100000,
      bidDiscount: 22000,
      netPrize: 78000,
      payoutDate: '2026-09-15T00:00:00.000Z',
      mode: 'BANK_TRANSFER',
      ref: 'NEFT-SBI-202609159981',
      guarantor1: 'K. Ramanaiah (+91 98480 91823)',
      guarantor2: 'B. Subba Rao (+91 98480 34123)',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <TopHeader
        title="Payout Records"
        subtitle="Prize Money Disbursements & Guarantor Ledgers"
      />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-3">
        <div className="space-y-3">
          {mockPayouts.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {p.voucherNumber}
                    </span>
                    <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                      Disbursed
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">{p.groupName}</h3>
                </div>

                <div className="text-right">
                  <div className="text-base sm:text-lg font-black text-slate-950 tabular-nums">
                    {formatINR(p.netPrize)}
                  </div>
                  <div className="text-[10px] text-slate-500">Net Prize Disbursed</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 py-3 border-b border-slate-100 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Prized Member</span>
                  <span className="font-bold text-slate-900">{p.winnerName}</span>
                  <span className="text-[10px] text-slate-500 block">Ticket #{p.ticketNumber}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Disbursement Date</span>
                  <span className="font-bold text-slate-900">{formatDate(p.payoutDate)}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Payment Mode & Ref</span>
                  <span className="font-bold text-teal-800 uppercase">{p.mode}</span>
                  <span className="text-[10px] text-slate-400 block font-mono">{p.ref}</span>
                </div>
              </div>

              <div className="pt-2.5 text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-[11px]">
                  <ShieldCheck size={14} className="text-teal-600" />
                  <span>Verified Guarantor Records:</span>
                </div>
                <div className="text-[11px] text-slate-600 pl-5">
                  1. {p.guarantor1}
                  <br />
                  2. {p.guarantor2}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
