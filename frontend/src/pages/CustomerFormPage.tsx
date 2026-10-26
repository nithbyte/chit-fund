import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, AlertCircle, Loader2, AlertTriangle, ExternalLink, X, Check } from 'lucide-react';
import { customersApi } from '../api/customers';
import type { DuplicateMatchItem } from '../api/customers';
import { TopHeader } from '../components/layout/TopHeader';

const customerSchema = z.object({
  fullName: z.string().min(2, 'Full name is required (min 2 characters)'),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number (e.g. 9848011223)'),
  alternatePhone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  identityProofType: z.string().optional().or(z.literal('')),
  identityProofNumber: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export const CustomerFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [serverError, setServerError] = useState<string | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatchItem[] | null>(null);
  const [pendingFormData, setPendingFormData] = useState<CustomerFormData | null>(null);

  const { data: existingCustomer } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getById(id!),
    enabled: isEditing,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      alternatePhone: '',
      address: '',
      identityProofType: 'Aadhaar Card',
      identityProofNumber: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (existingCustomer) {
      reset({
        fullName: existingCustomer.fullName,
        phone: existingCustomer.phone,
        alternatePhone: existingCustomer.alternatePhone || '',
        address: existingCustomer.address || '',
        identityProofType: existingCustomer.identityProofType || 'Aadhaar Card',
        identityProofNumber: existingCustomer.identityProofNumber || '',
        notes: existingCustomer.notes || '',
      });
    }
  }, [existingCustomer, reset]);

  const mutation = useMutation({
    mutationFn: async ({
      data,
      confirmDuplicate = false,
    }: {
      data: CustomerFormData;
      confirmDuplicate?: boolean;
    }) => {
      if (isEditing) {
        return customersApi.update(id!, data);
      }
      return customersApi.create({ ...data, confirmDuplicate });
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      setDuplicateMatches(null);
      setPendingFormData(null);
      navigate(`/customers/${saved.id}`);
    },
    onError: (err: any) => {
      setServerError(err.message || 'Failed to save customer');
    },
  });

  const onSubmit = async (data: CustomerFormData) => {
    setServerError(null);

    // If adding a new customer, perform duplicate check first
    if (!isEditing) {
      try {
        const check = await customersApi.checkDuplicate(data.phone, data.fullName);
        if (check.hasMatches) {
          const combined = [...check.matchingPhone, ...check.matchingName];
          // deduplicate by id
          const unique = combined.filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);
          setDuplicateMatches(unique);
          setPendingFormData(data);
          return;
        }
      } catch {
        // If check fails, allow proceeding directly
      }
    }

    mutation.mutate({ data, confirmDuplicate: false });
  };

  const handleConfirmDuplicateCreate = () => {
    if (!pendingFormData) return;
    mutation.mutate({ data: pendingFormData, confirmDuplicate: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <TopHeader
        title={isEditing ? 'Edit Customer' : 'Add New Customer'}
        subtitle="Notebook & Directory Record"
        showBack
        backPath={isEditing ? `/customers/${id}` : '/customers'}
      />

      <div className="max-w-xl mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          {serverError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('fullName')}
                placeholder="e.g. Ramesh Kumar Verma"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all font-medium"
              />
              {errors.fullName && (
                <p className="mt-1 text-[11px] text-red-600">{errors.fullName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number (WhatsApp/UPI) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs text-slate-500 font-semibold">
                    +91
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    {...register('phone')}
                    placeholder="9848011223"
                    className="w-full pl-11 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all font-mono"
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-[11px] text-red-600">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alternate Phone
                </label>
                <input
                  type="tel"
                  {...register('alternatePhone')}
                  placeholder="Optional landline / spouse"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Residential / Shop Address
              </label>
              <textarea
                rows={2}
                {...register('address')}
                placeholder="House #, Street, Village/Town, Landmark"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Identity Document
                </label>
                <select
                  {...register('identityProofType')}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                >
                  <option value="Aadhaar Card">Aadhaar Card</option>
                  <option value="PAN Card">PAN Card</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Ration Card">Ration Card</option>
                  <option value="Driving License">Driving License</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document / Aadhaar Number
                </label>
                <input
                  type="text"
                  {...register('identityProofNumber')}
                  placeholder="e.g. 5432 1098 7654"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Remarks / Personal Note
              </label>
              <input
                type="text"
                {...register('notes')}
                placeholder="e.g. Known through shopkeeper Ramesh; punctual with cash"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 touch-target"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving Customer Profile...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>{isEditing ? 'Update Customer' : 'Save Customer to Directory'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Duplicate Warning Modal */}
      {duplicateMatches && duplicateMatches.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-amber-300">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle size={20} />
                <h3 className="text-base font-bold text-slate-900">
                  Potential Duplicate Customer
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDuplicateMatches(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              We found existing customer records with matching phone number or name. Note that family members in small towns sometimes share a phone:
            </p>

            <div className="space-y-2 mt-3 max-h-48 overflow-y-auto">
              {duplicateMatches.map((match) => (
                <div
                  key={match.id}
                  className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{match.fullName}</span>
                      <span className="font-mono text-[10px] text-amber-900 px-1 py-0.2 rounded bg-amber-100">
                        {match.customerCode}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Phone: {match.phone} • {match.address || 'Guntur'}
                    </div>
                  </div>

                  <Link
                    to={`/customers/${match.id}`}
                    target="_blank"
                    className="p-1.5 rounded-lg bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 text-[11px] font-semibold flex items-center gap-1 shrink-0"
                  >
                    <span>View</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => setDuplicateMatches(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel & Edit Info
              </button>

              <button
                type="button"
                onClick={handleConfirmDuplicateCreate}
                disabled={mutation.isPending}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                {mutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                <span>Confirm & Create Separate Record</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
