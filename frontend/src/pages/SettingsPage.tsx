import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Phone,
  MapPin,
  User,
  Clock,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { settingsApi } from '../api/settings';
import type { SystemSettings } from '../api/settings';
import { TopHeader } from '../components/layout/TopHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<SystemSettings>({
    company_name: 'Durga Chit Fund',
    company_address: 'Main Road, Brodipet, Guntur, AP - 522002',
    company_phone: '+91 98480 11223',
    company_proprietor: 'Durga Devi',
    business_timezone: 'Asia/Kolkata',
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: settingsApi.getAll,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        company_name: settings.company_name || 'Durga Chit Fund',
        company_address: settings.company_address || 'Main Road, Brodipet, Guntur, AP - 522002',
        company_phone: settings.company_phone || '+91 98480 11223',
        company_proprietor: settings.company_proprietor || 'Durga Devi',
        business_timezone: settings.business_timezone || 'Asia/Kolkata',
      });
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (updates: Partial<SystemSettings>) => settingsApi.update(updates),
    onSuccess: (updated) => {
      queryClient.setQueryData(['systemSettings'], updated);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSaveSuccess(true);
      setErrorMessage(null);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to update system settings');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    mutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <TopHeader
        title="Company & Receipt Settings"
        subtitle="Receipt Headers & Legal Profile"
        showBack
        backPath="/more"
      />

      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {saveSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 shadow-xs">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span className="font-semibold">Company profile updated! Printed receipts will reflect the new details.</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2 shadow-xs">
            <AlertCircle size={16} className="text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isLoading ? (
          <LoadingSpinner message="Loading system settings..." />
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
            Failed to load settings.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Company / Business Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Building2 size={15} />
                </div>
                <input
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Durga Chit Fund"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 font-bold text-slate-900"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Printed prominently at the top of every customer payment receipt.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Proprietor / Foreman Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User size={15} />
                </div>
                <input
                  type="text"
                  required
                  value={formData.company_proprietor}
                  onChange={(e) => setFormData({ ...formData, company_proprietor: e.target.value })}
                  placeholder="Durga Devi"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contact Phone / WhatsApp *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone size={15} />
                </div>
                <input
                  type="text"
                  required
                  value={formData.company_phone}
                  onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                  placeholder="+91 98480 11223"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 font-mono text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Business Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 pt-2.5 pointer-events-none text-slate-400">
                  <MapPin size={15} />
                </div>
                <textarea
                  rows={2}
                  required
                  value={formData.company_address}
                  onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
                  placeholder="Main Road, Brodipet, Guntur, AP - 522002"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Business Timezone (Immutable)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Clock size={15} />
                </div>
                <input
                  type="text"
                  disabled
                  value={formData.business_timezone}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors touch-target"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving Settings...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Company Settings</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
