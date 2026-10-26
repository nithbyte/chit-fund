import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Layers,
  Gavel,
  BadgePercent,
  FileText,
  Shield,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Clock,
  Database,
  Receipt,
  FileSpreadsheet,
  Upload,
  Settings,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TopHeader } from '../components/layout/TopHeader';

export const MorePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuSections = [
    {
      title: 'Daily Operations & Registers',
      items: [
        { name: 'Collections Register', path: '/register', icon: Receipt, desc: 'Daily payment ledger, cash/UPI totals & reversals' },
        { name: 'Daily Reconciliation', path: '/reconciliation', icon: FileSpreadsheet, desc: 'Compare software records with cash drawer & bank' },
        { name: 'Operating Expenses', path: '/expenses', icon: DollarSign, desc: 'Record office rent, tea, stationery & petty cash' },
      ],
    },
    {
      title: 'Chit Operations & Auctions',
      items: [
        { name: 'Chit Groups & Batches', path: '/chit-groups', icon: Layers, desc: 'Manage schemes, enrollments and schedules' },
        { name: 'Auction Bids & Records', path: '/auctions', icon: Gavel, desc: 'Record bids, calculate 5% foreman commission' },
        { name: 'Prize Payouts', path: '/payouts', icon: BadgePercent, desc: 'Prize disbursements and guarantor records' },
        { name: 'Business Reports', path: '/reports', icon: FileText, desc: 'Revenue, collections & portfolio summaries' },
      ],
    },
    {
      title: 'Data & Administration',
      items: [
        { name: 'Data Migration & CSV Import', path: '/import', icon: Upload, desc: 'Import customer records safely from Excel/CSV' },
        { name: 'Company & Receipt Settings', path: '/settings', icon: Settings, desc: 'Configure company name, phone & receipt header' },
        { name: 'Security Audit Logs', path: '/audit-logs', icon: Shield, desc: 'Immutable trail of payments, reversals & actions' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <TopHeader title="More & Settings" subtitle="System Configuration" />

      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {/* Owner Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-700 text-white font-black text-lg flex items-center justify-center shadow-xs">
              {user?.fullName?.slice(0, 1) || 'D'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  {user?.fullName || 'Durga Devi'}
                </h3>
                <ShieldCheck size={16} className="text-teal-600" />
              </div>
              <p className="text-xs text-teal-800 font-medium">Proprietor & Foreman</p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">{user?.email || 'durga@durgachitfund.com'}</p>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        {menuSections.map((section) => (
          <div key={section.title} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-100/60 border-b border-slate-100 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              {section.title}
            </div>
            <div className="divide-y divide-slate-100">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors block"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                        <Icon size={17} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{item.name}</div>
                        <div className="text-[11px] text-slate-500">{item.desc}</div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-400" />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Financial Standards & Settings Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs text-xs space-y-2">
          <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            System & Regulatory Standards
          </h4>
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Clock size={13} />
              <span>Business Timezone</span>
            </span>
            <span className="font-semibold text-slate-900">Asia/Kolkata (IST)</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Base Currency</span>
            <span className="font-semibold text-slate-900">INR (₹)</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Shield size={13} />
              <span>Security & Password Hash</span>
            </span>
            <span className="font-mono text-teal-700 font-semibold text-[11px]">Argon2id + JWT</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Database size={13} />
              <span>Database Foundation</span>
            </span>
            <span className="font-semibold text-slate-900">PostgreSQL + Prisma ORM</span>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={handleLogout}
          className="w-full py-3 px-4 rounded-xl bg-white hover:bg-red-50 text-red-700 border border-red-200 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors touch-target"
        >
          <LogOut size={16} />
          <span>Sign Out of Durga Chit Fund</span>
        </button>
      </div>
    </div>
  );
};
