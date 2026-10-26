import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Users, ChevronRight, X, Loader2 } from 'lucide-react';
import { chitGroupsApi } from '../api/chit-groups';
import { TopHeader } from '../components/layout/TopHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatINR } from '../utils/formatters';

export const ChitGroupsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    groupCode: '',
    name: '',
    chitType: 'AUCTION_BASED' as 'AUCTION_BASED' | 'FIXED_INSTALLMENT',
    totalValue: 100000,
    monthlyContribution: 5000,
    totalMonths: 20,
    startDate: new Date().toISOString().split('T')[0],
    foremanCommissionRate: 5.0,
    notes: '',
  });

  const { data: groups, isLoading, error } = useQuery({
    queryKey: ['chitGroups'],
    queryFn: chitGroupsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => chitGroupsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chitGroups'] });
      setIsModalOpen(false);
      setFormData({
        groupCode: '',
        name: '',
        chitType: 'AUCTION_BASED',
        totalValue: 100000,
        monthlyContribution: 5000,
        totalMonths: 20,
        startDate: new Date().toISOString().split('T')[0],
        foremanCommissionRate: 5.0,
        notes: '',
      });
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create chit group');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    createMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <TopHeader
        title="Chit Groups"
        subtitle="Auction & Fixed Savings Schemes"
        rightAction={
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors shadow-xs touch-target"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Chit Group</span>
            <span className="sm:hidden">New</span>
          </button>
        }
      />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <LoadingSpinner message="Loading chit schemes..." />
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
            Failed to load chit groups.
          </div>
        ) : groups && groups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {groups.map((group) => {
              const enrolled = group.enrolledMembersCount ?? 0;
              const totalSlots = group.totalMonths;
              const fillPct = Math.round((enrolled / totalSlots) * 100);

              return (
                <Link
                  key={group.id}
                  to={`/chit-groups/${group.id}`}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-teal-300 hover:shadow-sm transition-all block"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {group.groupCode}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                          {group.chitType === 'AUCTION_BASED' ? 'Auction Based' : 'Fixed Savings'}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                        {group.name}
                      </h3>
                    </div>

                    <div className="text-right">
                      <div className="text-base sm:text-lg font-black text-teal-800 tabular-nums">
                        {formatINR(group.totalValue)}
                      </div>
                      <div className="text-[10px] text-slate-500">Chit Pool Value</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-3 text-center border-b border-slate-100">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-medium">Monthly</div>
                      <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                        {formatINR(group.monthlyContribution)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-medium">Progress</div>
                      <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                        Mo. {group.currentMonth}/{group.totalMonths}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-medium">Commission</div>
                      <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                        {group.foremanCommissionRate}% (₹{(group.totalValue * (group.foremanCommissionRate / 100)).toLocaleString('en-IN')})
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-slate-400" />
                      <span className="text-slate-600 font-medium">
                        {enrolled}/{totalSlots} slots enrolled
                      </span>
                      {totalSlots - enrolled > 0 && (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          {totalSlots - enrolled} vacant
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-teal-700 font-semibold">
                      <span>Schedule & Details</span>
                      <ChevronRight size={15} />
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                    <div
                      className="bg-teal-600 h-full rounded-full transition-all"
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
            <p className="text-sm text-slate-700 font-medium">No chit groups created yet</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-3 px-4 py-2 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors"
            >
              Create First Chit Group
            </button>
          </div>
        )}
      </div>

      {/* New Chit Group Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create New Chit Scheme</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Group Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.groupCode}
                    onChange={(e) => setFormData({ ...formData, groupCode: e.target.value })}
                    placeholder="e.g. CF-200K-20M"
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Scheme Type *
                  </label>
                  <select
                    value={formData.chitType}
                    onChange={(e) =>
                      setFormData({ ...formData, chitType: e.target.value as any })
                    }
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  >
                    <option value="AUCTION_BASED">Auction Based Chit</option>
                    <option value="FIXED_INSTALLMENT">Fixed Savings Chit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chit Title / Batch Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. ₹2 Lakh 20-Month Batch C"
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Value (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.totalValue}
                    onChange={(e) =>
                      setFormData({ ...formData, totalValue: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Duration (Mo.) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.totalMonths}
                    onChange={(e) =>
                      setFormData({ ...formData, totalMonths: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Per Month (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.monthlyContribution}
                    onChange={(e) =>
                      setFormData({ ...formData, monthlyContribution: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Foreman Comm. (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.foremanCommissionRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        foremanCommissionRate: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none tabular-nums"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  <span>Save Chit Scheme</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
