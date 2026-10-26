import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheck, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: 'durga',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setServerError(null);
      await login(data);
      navigate(from, { replace: true });
    } catch (err: any) {
      setServerError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Logo */}
        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 rounded-2xl bg-teal-500 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
            D
          </div>
        </div>
        <h2 className="text-center text-2xl font-bold tracking-tight text-white">
          Durga Chit Fund
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Owner Collection & Ledger Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-5 sm:px-8 shadow-xl rounded-2xl border border-slate-200">
          {serverError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User size={16} />
                </div>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  {...register('username')}
                  className="block w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
                  placeholder="durga"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-[11px] text-red-600">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register('password')}
                  className="block w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-[11px] text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-teal-700 text-white font-semibold text-sm hover:bg-teal-800 active:scale-[0.99] transition-all disabled:opacity-50 touch-target shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Sign In to System</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick onboarding credential helper for owner */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600 border border-slate-200">
              <span className="font-semibold text-slate-800 block mb-0.5">
                Default Owner Credentials:
              </span>
              Username: <code className="bg-slate-200 px-1 rounded text-slate-900">durga</code>
              <br />
              Password: <code className="bg-slate-200 px-1 rounded text-slate-900">Durga@Chit2026!</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
