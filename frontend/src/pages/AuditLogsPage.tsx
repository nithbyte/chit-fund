import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldAlert,
  Filter,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  Code,
  FileText,
} from 'lucide-react';
import { auditLogsApi } from '../api/audit-logs';
import { TopHeader } from '../components/layout/TopHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const ACTION_TYPES = [
  'COLLECTION_RECORDED',
  'PAYMENT_REVERSED',
  'PAYOUT_DISBURSED',
  'EXPENSE_RECORDED',
  'AUCTION_COMPLETED',
  'CSV_IMPORTED',
  'DAILY_RECONCILED',
  'CUSTOMER_REGISTERED',
  'CHIT_GROUP_CREATED',
];

const ENTITY_TYPES = [
  'Payment',
  'Payout',
  'Expense',
  'Auction',
  'Customer',
  'ChitGroup',
  'Reconciliation',
  'ImportBatch',
];

export const AuditLogsPage: React.FC = () => {
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [page, setPage] = useState(1);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['auditLogs', { action: selectedAction, entityType: selectedEntity, page }],
    queryFn: () =>
      auditLogsApi.getAll({
        action: selectedAction || undefined,
        entityType: selectedEntity || undefined,
        page,
        limit: 20,
      }),
  });

  const getActionBadge = (action: string) => {
    if (action.includes('REVERSED')) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (action.includes('COLLECTION') || action.includes('REGISTERED')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (action.includes('PAYOUT') || action.includes('EXPENSE')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    return 'bg-teal-50 text-teal-700 border-teal-200';
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <TopHeader
        title="Audit Logs"
        subtitle="Immutable System & Financial Activity Records"
      />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <span className="text-slate-500 font-medium">Action:</span>
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-800 font-medium text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
            >
              <option value="">All Actions</option>
              {ACTION_TYPES.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Entity:</span>
            <select
              value={selectedEntity}
              onChange={(e) => {
                setSelectedEntity(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-800 font-medium text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
            >
              <option value="">All Entities</option>
              {ENTITY_TYPES.map((ent) => (
                <option key={ent} value={ent}>
                  {ent}
                </option>
              ))}
            </select>
          </div>

          {(selectedAction || selectedEntity) && (
            <button
              onClick={() => {
                setSelectedAction('');
                setSelectedEntity('');
                setPage(1);
              }}
              className="text-teal-700 hover:text-teal-900 font-semibold text-xs ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Audit Log List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3.5 bg-slate-100/60 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-teal-700" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Audited System Events
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Total {data?.total ?? 0} events logged
            </span>
          </div>

          {isLoading ? (
            <div className="p-10">
              <LoadingSpinner message="Retrieving secure audit records..." />
            </div>
          ) : !data?.items || data.items.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              <FileText size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">No audit events match your filter criteria.</p>
              <p className="text-slate-400 text-[11px] mt-1">
                Every financial modification, reversal, payout, and login is immutably logged here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.items.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <div key={log.id} className="p-3.5 hover:bg-slate-50/70 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start sm:items-center gap-2.5">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getActionBadge(
                            log.action,
                          )}`}
                        >
                          {log.action}
                        </span>
                        <span className="text-xs font-semibold text-slate-900">
                          {log.entityType}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 truncate max-w-[140px]">
                          #{log.entityId.slice(0, 8)}...
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <User size={13} className="text-slate-400" />
                          <span className="font-medium text-slate-700">{log.performedBy}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={13} className="text-slate-400" />
                          <span>{new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                        </span>
                        {log.metadata && (
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="text-teal-700 hover:text-teal-900 font-semibold text-xs ml-1 flex items-center gap-0.5"
                          >
                            <Code size={13} />
                            <span>{isExpanded ? 'Hide Payload' : 'View Payload'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded && log.metadata && (
                      <div className="mt-3 p-3 rounded-lg bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto shadow-inner">
                        <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                Page {data.page} of {data.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={data.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-40 hover:bg-white"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={data.page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-40 hover:bg-white"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogsPage;
