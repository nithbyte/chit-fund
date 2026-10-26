import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Receipt,
  Plus,
  Trash2,
  X,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { expensesApi, type CreateExpensePayload } from '../api/expenses';
import { TopHeader } from '../components/layout/TopHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatINR, formatDate } from '../utils/formatters';

const CATEGORIES = [
  'Office Rent',
  'Tea & Refreshments',
  'Stationery & Printing',
  'Utilities & Electricity',
  'Travel & Conveyance',
  'Software & Telephony',
  'Miscellaneous',
];

export const ExpensesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState<CreateExpensePayload>({
    title: '',
    category: 'Tea & Refreshments',
    amount: '' as any,
    expenseDate: todayStr,
    paymentMode: 'CASH',
    reference: '',
    notes: '',
  });
  const [formError, setFormError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', { startDate, endDate, category: selectedCategory }],
    queryFn: () =>
      expensesApi.getAll({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        category: selectedCategory || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation'] });
      setIsModalOpen(false);
      setFormData({
        title: '',
        category: 'Tea & Refreshments',
        amount: '' as any,
        expenseDate: todayStr,
        paymentMode: 'CASH',
        reference: '',
        notes: '',
      });
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to record expense');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: expensesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation'] });
    },
    onError: (err: any) => {
      alert(`Could not delete: ${err.message}`);
    },
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const parsedAmount = Number(formData.amount);
    if (!formData.title.trim()) {
      setFormError('Please enter an expense title/purpose.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Amount must be a valid positive number.');
      return;
    }

    createMutation.mutate({
      ...formData,
      amount: parsedAmount,
    });
  };

  const handleDelete = (id: string, title: string, amount: number) => {
    if (window.confirm(`Are you sure you want to remove expense "${title}" for ${formatINR(amount)}?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <TopHeader
        title="Business Expenses"
        subtitle="Petty Cash & Operating Overheads"
        rightAction={
          <button
            onClick={() => {
              setFormError('');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors shadow-xs touch-target"
          >
            <Plus size={16} />
            <span>Record Expense</span>
          </button>
        }
      />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Filters bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-800 font-medium text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-800 font-medium text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-800 font-medium text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {(startDate || endDate || selectedCategory) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSelectedCategory('');
              }}
              className="text-teal-700 hover:text-teal-900 font-semibold text-xs ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Totals Summary */}
        {data?.totals && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Total Expenses
              </span>
              <span className="text-xl font-black text-rose-600 tabular-nums">
                {formatINR(data.totals.totalAmount)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {data.totals.count} entries recorded
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Cash Outflow
              </span>
              <span className="text-xl font-black text-slate-900 tabular-nums">
                {formatINR(data.totals.modeTotals?.CASH || 0)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Paid from petty cash</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                UPI Outflow
              </span>
              <span className="text-xl font-black text-slate-900 tabular-nums">
                {formatINR(data.totals.modeTotals?.UPI || 0)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">QR / PhonePe / GPay</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Bank / Cheque
              </span>
              <span className="text-xl font-black text-slate-900 tabular-nums">
                {formatINR(
                  (data.totals.modeTotals?.BANK_TRANSFER || 0) +
                    (data.totals.modeTotals?.CHEQUE || 0),
                )}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">NEFT / RTGS / Cheques</span>
            </div>
          </div>
        )}

        {/* Expenses Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3.5 bg-slate-100/60 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={16} className="text-teal-700" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Recorded Overheads Ledger
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {data?.expenses.length ?? 0} records
            </span>
          </div>

          {isLoading ? (
            <div className="p-8">
              <LoadingSpinner message="Loading expense records..." />
            </div>
          ) : !data?.expenses || data.expenses.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              <FileText size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">No expenses found for this period.</p>
              <p className="text-slate-400 text-[11px] mt-1">
                Use the "Record Expense" button to log office rent, tea, or supplies.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Purpose / Title</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3">Reference / Notes</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {data.expenses.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                        {formatDate(item.expenseDate)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {item.title}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            item.paymentMode === 'CASH'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-teal-50 text-teal-800 border border-teal-200'
                          }`}
                        >
                          {item.paymentMode}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                        {item.reference ? (
                          <span className="font-mono text-slate-700 mr-1">
                            [{item.reference}]
                          </span>
                        ) : null}
                        {item.notes || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-700 tabular-nums">
                        {formatINR(item.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleDelete(item.id, item.title, item.amount)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete expense"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Record Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-teal-700" />
                <h3 className="font-bold text-slate-900 text-sm">Record Business Expense</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-4 space-y-3.5 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Purpose / Expense Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Office Rent for current month"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Payment Mode *</label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentMode: e.target.value as CreateExpensePayload['paymentMode'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="CASH">Cash (Petty Cash)</option>
                    <option value="UPI">UPI (GPay / PhonePe)</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="e.g. 500"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Date *</label>
                  <input
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Reference / Bill No. (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bill #104 or UPI Ref"
                  value={formData.reference || ''}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Notes / Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional remarks..."
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition-colors disabled:opacity-50 shadow-xs"
                >
                  {createMutation.isPending ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesPage;
