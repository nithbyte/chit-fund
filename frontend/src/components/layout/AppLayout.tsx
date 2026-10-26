import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  IndianRupee,
  Layers,
  Gavel,
  BadgePercent,
  FileText,
  Settings,
  LogOut,
  ShieldCheck,
  DollarSign,
  BarChart3,
  Shield,
  FileSpreadsheet,
  Upload,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BottomNav } from './BottomNav';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Collect Money', path: '/collect', icon: IndianRupee, badge: 'Daily' },
    { name: 'Collections Register', path: '/register', icon: FileText },
    { name: 'Reconciliation', path: '/reconciliation', icon: FileSpreadsheet },
    { name: 'Operating Expenses', path: '/expenses', icon: DollarSign },
    { name: 'Chit Groups', path: '/chit-groups', icon: Layers },
    { name: 'Auctions', path: '/auctions', icon: Gavel },
    { name: 'Prize Payouts', path: '/payouts', icon: BadgePercent },
    { name: 'Reports & Ledgers', path: '/reports', icon: BarChart3 },
    { name: 'Data Migration', path: '/import', icon: Upload },
    { name: 'Audit Logs', path: '/audit-logs', icon: Shield },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shrink-0 min-h-screen sticky top-0 h-screen border-r border-slate-800">
        {/* Brand header */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500 text-slate-950 font-black text-base flex items-center justify-center shadow-md">
              D
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-base tracking-tight">Durga Chit Fund</span>
                <ShieldCheck size={16} className="text-teal-400" />
              </div>
              <span className="text-xs text-slate-400 block -mt-0.5">Management System</span>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Owner profile & logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {user?.fullName?.slice(0, 1) || 'D'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">{user?.fullName || 'Durga'}</div>
                <div className="text-[11px] text-teal-300 truncate font-mono">Owner / Admin</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-md transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <main className="flex-1 pb-20 md:pb-8">
          <Outlet />
        </main>

        {/* Mobile Fixed Bottom Navigation */}
        <BottomNav />
      </div>
    </div>
  );
};
