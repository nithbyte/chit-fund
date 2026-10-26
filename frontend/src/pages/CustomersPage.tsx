import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  Phone,
  Layers,
  ChevronRight,
  IndianRupee,
  ChevronLeft,
} from 'lucide-react';
import { customersApi } from '../api/customers';
import { TopHeader } from '../components/layout/TopHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatPhone } from '../utils/formatters';

export const CustomersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const limit = 15;

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['customers', searchTerm, page, statusFilter],
    queryFn: () =>
      customersApi.getAll({
        search: searchTerm,
        page,
        limit,
        status: statusFilter === 'ALL' ? undefined : statusFilter.toLowerCase(),
      }),
  });

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setPage(1); // reset to page 1 on search
  };

  const customers = response?.items || [];
  const total = response?.total || 0;
  const totalPages = response?.totalPages || 1;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <TopHeader
        title="Customers"
        subtitle="Notebook & Excel Directory"
        rightAction={
          <Link
            to="/customers/new"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors shadow-xs touch-target"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Customer</span>
            <span className="sm:hidden">Add</span>
          </Link>
        }
      />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-3">
        {/* Search Bar & Status Filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by name, 10-digit phone, or code (e.g. Ramesh, 9848...)"
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all shadow-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl p-1 shrink-0 self-start">
            {(
              [
                { id: 'ALL', label: 'All' },
                { id: 'ACTIVE', label: 'Active' },
                { id: 'INACTIVE', label: 'Inactive' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  statusFilter === tab.id
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* List of Customers */}
        {isLoading ? (
          <LoadingSpinner message="Loading customer directory..." />
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
            Failed to load customers. Please check backend connection.
          </div>
        ) : customers.length > 0 ? (
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1 flex items-center justify-between">
              <span>
                Showing {customers.length} of {total} customer records
              </span>
              <span>
                Page {page} of {totalPages}
              </span>
            </div>

            {customers.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs hover:border-teal-300 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/customers/${c.id}`} className="min-w-0 flex-1 block">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {c.fullName}
                      </span>
                      <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {c.customerCode}
                      </span>
                      {!c.isActive && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-700 uppercase">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Phone size={12} className="text-slate-400" />
                        <span>{formatPhone(c.phone)}</span>
                      </span>

                      <span className="flex items-center gap-1">
                        <Layers size={12} className="text-teal-600" />
                        <span>{c.activeMembershipsCount ?? 0} active chits</span>
                      </span>
                    </div>

                    {c.address && (
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {c.address}
                      </p>
                    )}
                  </Link>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/collect?customerId=${c.id}`}
                      className="p-2 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 flex items-center justify-center touch-target text-xs font-semibold"
                      title="Collect Payment"
                    >
                      <IndianRupee size={15} />
                      <span className="hidden sm:inline ml-1">Collect</span>
                    </Link>

                    <Link
                      to={`/customers/${c.id}`}
                      className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 touch-target flex items-center justify-center"
                      aria-label="View details"
                    >
                      <ChevronRight size={18} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 pb-2 border-t border-slate-200">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ChevronLeft size={15} />
                  <span>Previous</span>
                </button>

                <span className="text-xs text-slate-600 font-medium">
                  Page <span className="font-bold text-slate-900">{page}</span> of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <span>Next</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
            <p className="text-sm text-slate-600 font-medium">No customers found</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchTerm
                ? 'Try a different search keyword'
                : 'Add your first customer to get started.'}
            </p>
            <Link
              to="/customers/new"
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors"
            >
              <Plus size={15} />
              <span>Add Customer</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
