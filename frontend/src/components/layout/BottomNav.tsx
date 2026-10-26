import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, IndianRupee, Menu } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const tabs = [
    { name: 'Home', path: '/dashboard', icon: Home },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Collect', path: '/collect', icon: IndianRupee, highlight: true },
    { name: 'More', path: '/more', icon: Menu },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 md:hidden pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-2px_10px_rgba(0,0,0,0.04)]"
    >
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.name}
              to={tab.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-medium transition-colors select-none touch-target ${
                  isActive
                    ? 'text-teal-700 font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`relative flex items-center justify-center w-10 h-7 rounded-full mb-0.5 transition-all ${
                      tab.highlight
                        ? isActive
                          ? 'bg-teal-700 text-white shadow-sm'
                          : 'bg-teal-50 text-teal-700 border border-teal-200'
                        : isActive
                        ? 'bg-slate-100 text-teal-700'
                        : 'text-slate-500'
                    }`}
                  >
                    <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className="text-[11px] leading-tight tracking-tight">{tab.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
