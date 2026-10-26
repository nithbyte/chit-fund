import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Phone,
  MapPin,
  FileCheck,
  IndianRupee,
  Layers,
  Edit2,
  Receipt,
} from 'lucide-react';
import { customersApi } from '../api/customers';
import { TopHeader } from '../components/layout/TopHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { StatCard } from '../components/ui/StatCard';
import { formatINR, formatDate, formatPhone } from '../utils/formatters';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopHeader title="Customer Details" showBack backPath="/customers" />
        <LoadingSpinner message="Fetching customer ledger..." />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopHeader title="Customer Details" showBack backPath="/customers" />
        <div className="max-w-md mx-auto p-4 mt-8 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
          Customer not found or error loading record.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <TopHeader
        title={customer.fullName}
        subtitle={customer.customerCode}
        showBack
        backPath="/customers"
        rightAction={
          <Link
            to={`/customers/${customer.id}/edit`}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 touch-target flex items-center justify-center transition-colors"
            title="Edit Customer Details"
          >
            <Edit2 size={17} />
          </Link>
        }
      />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Customer Header Info Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{customer.fullName}</h2>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                  {customer.customerCode}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1.5">
                <a
                  href={`tel:${customer.phone}`}
                  className="flex items-center gap-1.5 text-teal-800 font-semibold hover:underline"
                >
                  <Phone size={13} className="text-teal-600" />
                  <span>{formatPhone(customer.phone)}</span>
                </a>
                {customer.alternatePhone && (
                  <span className="text-slate-400">
                    Alt: {formatPhone(customer.alternatePhone)}
                  </span>
                )}
              </div>
            </div>

            <Link
              to={`/collect?customerId=${customer.id}`}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors touch-target"
            >
              <IndianRupee size={15} />
              <span>Collect Payment</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs text-slate-600">
            {customer.address && (
              <div className="flex items-start gap-1.5">
                <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                <span>{customer.address}</span>
              </div>
            )}
            {customer.identityProofNumber && (
              <div className="flex items-start gap-1.5">
                <FileCheck size={14} className="text-slate-400 mt-0.5 shrink-0" />
                <span>
                  {customer.identityProofType || 'ID Proof'}: {customer.identityProofNumber}
                </span>
              </div>
            )}
          </div>

          {customer.notes && (
            <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Notebook Note: </span>
              {customer.notes}
            </div>
          )}
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            title="Total Paid"
            value={formatINR(customer.summary?.totalPaid ?? 0)}
            subtitle="Verified collections received"
            variant="teal"
          />

          <StatCard
            title="Outstanding Dues"
            value={formatINR(customer.summary?.totalDues ?? 0)}
            subtitle="Pending installment balances"
            variant={customer.summary?.totalDues && customer.summary.totalDues > 0 ? 'amber' : 'default'}
          />
        </div>

        {/* Enrolled Chit Memberships */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-teal-700" />
              <h3 className="text-sm font-semibold text-slate-900">Enrolled Chit Batches</h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {customer.memberships?.length || 0} Batches
            </span>
          </div>

          {(!customer.memberships || customer.memberships.length === 0) ? (
            <div className="p-6 text-center text-xs text-slate-500">
              Customer is not enrolled in any chit groups yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {customer.memberships.map((m: any) => (
                <div key={m.id} className="p-3.5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/chit-groups/${m.chitGroup.id}`}
                        className="text-sm font-bold text-slate-900 hover:text-teal-700 transition-colors"
                      >
                        {m.chitGroup.name}
                      </Link>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {m.chitGroup.groupCode}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>Ticket #{m.ticketNumber}</span>
                      <span>•</span>
                      <span>{formatINR(m.chitGroup.monthlyContribution)}/month</span>
                      <span>•</span>
                      <span className="capitalize">{m.chitGroup.chitType.replace('_', ' ').toLowerCase()}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    {m.isPrized ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        Prized (Month {m.prizedMonth})
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                        Active Non-Prized
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment History List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={16} className="text-teal-700" />
              <h3 className="text-sm font-semibold text-slate-900">Payment History & Receipts</h3>
            </div>
            <span className="text-xs text-slate-500">
              {customer.payments?.length || 0} Receipts
            </span>
          </div>

          {(!customer.payments || customer.payments.length === 0) ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No payments recorded yet for this customer.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {customer.payments.map((p: any) => (
                <Link
                  key={p.id}
                  to={`/receipts/${p.id}`}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors block"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-900">
                        {p.receiptNumber}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 uppercase">
                        {p.paymentMode}
                      </span>
                      {p.isReversed && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-red-100 text-red-800">
                          Reversed
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {formatDate(p.paymentDate)}
                      {p.transactionRef && ` • Ref: ${p.transactionRef}`}
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-sm font-bold tabular-nums ${
                        p.isReversed ? 'line-through text-slate-400' : 'text-teal-800'
                      }`}
                    >
                      +{formatINR(p.amount)}
                    </div>
                    <div className="text-[10px] text-slate-400">View Receipt</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
