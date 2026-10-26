import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Plus, Phone, Layers, ChevronRight, IndianRupee } from 'lucide-react';
import { customersApi } from '../api/customers';
import { TopHeader } from '../components/layout/TopHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatPhone } from '../utils/formatters';

export const CustomersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: customers, isLoading, error } = useQuery({
    queryKey: ['customers', searchTerm],
    queryFn: () => customersApi.getAll(searchTerm),
  });

  return (
    <div className="min-h-screen bg-slate-50">
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
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, 10-digit phone, or code (e.g. Ramesh, 9848...)"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all shadow-xs"
          />
        </div>

        {/* List of Customers */}
        {isLoading ? (
          <LoadingSpinner message="Loading customer directory..." />
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
            Failed to load customers. Please check backend connection.
          </div>
        ) : customers && customers.length > 0 ? (
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1">
              Showing {customers.length} customer records
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

                    {c.notes && (
                      <p className="text-[11px] text-slate-400 truncate mt-1 italic">
                        "{c.notes}"
                      </p>
                    )}
                  </Link>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/collect?customerId=${c.id}`}
                      className="p-2 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 flex items-center justify-center touch-target text-xs font-semibold"
                      title="Collect Money from Customer"
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
