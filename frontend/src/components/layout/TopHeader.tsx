import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface TopHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  backPath?: string;
  rightAction?: React.ReactNode;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  backPath,
  rightAction,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {showBack && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Go back"
              className="p-1.5 -ml-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg touch-target flex items-center justify-center transition-colors"
            >
              <ChevronLeft size={22} />
            </button>
          )}

          <div className="min-w-0">
            {title ? (
              <>
                <h1 className="text-base sm:text-lg font-semibold text-slate-900 truncate tracking-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs text-slate-500 truncate -mt-0.5">{subtitle}</p>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-700 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  D
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900 tracking-tight">Durga Chit Fund</span>
                    <ShieldCheck size={14} className="text-teal-600" />
                  </div>
                  <span className="text-[11px] text-slate-500 block -mt-0.5">Collection & Ledger System</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {rightAction}
          {!rightAction && user && (
            <div className="flex items-center gap-2 pl-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-xs flex items-center justify-center">
                {user.fullName.slice(0, 1)}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
