import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, AlertCircle, Loader2 } from 'lucide-react';
import { customersApi } from '../api/customers';
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

  const { data: existingCustomer } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getById(id!),
    enabled: isEditing,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
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
    mutationFn: async (data: CustomerFormData) => {
      if (isEditing) {
        return customersApi.update(id!, data);
      }
      return customersApi.create(data);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      navigate(`/customers/${saved.id}`);
    },
    onError: (err: any) => {
      setServerError(err.message || 'Failed to save customer');
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    setServerError(null);
    mutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <TopHeader
        title={isEditing ? 'Edit Customer' : 'Add New Customer'}
        subtitle="Notebook & Directory Record"
        showBack
        backPath={isEditing ? `/customers/${id}` : '/customers'}
      />

      <div className="max-w-xl mx-auto px-4 py-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          {serverError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
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
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
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
                  placeholder="Optional backup phone"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
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
                placeholder="Door No, Street, Landmark, Village / Town"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Identity Proof Type
                </label>
                <select
                  {...register('identityProofType')}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
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
                  ID Document Number
                </label>
                <input
                  type="text"
                  {...register('identityProofNumber')}
                  placeholder="e.g. XXXX-XXXX-1234"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notebook Notes / Credit Remarks
              </label>
              <textarea
                rows={2}
                {...register('notes')}
                placeholder="e.g. Shopkeeper near market, pays cash on 5th, introduced by Ramesh"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
              />
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting || mutation.isPending}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-teal-700 text-white font-semibold text-sm hover:bg-teal-800 transition-all disabled:opacity-50 touch-target shadow-xs"
              >
                {isSubmitting || mutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving Customer...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>{isEditing ? 'Save Changes' : 'Create Customer Record'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
