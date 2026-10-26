import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'teal' | 'navy' | 'amber';
  badge?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  badge,
}) => {
  const variantStyles = {
    default: 'bg-white border-slate-200 text-slate-900',
    teal: 'bg-teal-50/70 border-teal-200 text-teal-950',
    navy: 'bg-slate-900 border-slate-800 text-white',
    amber: 'bg-amber-50/70 border-amber-200 text-amber-950',
  };

  const iconStyles = {
    default: 'bg-slate-100 text-slate-700',
    teal: 'bg-teal-600 text-white',
    navy: 'bg-slate-800 text-teal-400',
    amber: 'bg-amber-500 text-white',
  };

  const valueStyles = {
    default: 'text-slate-900',
    teal: 'text-teal-900',
    navy: 'text-white',
    amber: 'text-amber-900',
  };

  return (
    <div
      className={`p-4 rounded-xl border shadow-xs transition-all ${variantStyles[variant]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className={`text-xs font-medium tracking-tight ${
                variant === 'navy' ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              {title}
            </span>
            {badge && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-teal-100 text-teal-800 border border-teal-200">
                {badge}
              </span>
            )}
          </div>
          <div
            className={`text-xl sm:text-2xl font-bold tracking-tight tabular-nums ${valueStyles[variant]}`}
          >
            {value}
          </div>
          {subtitle && (
            <div
              className={`text-[11px] mt-1 ${
                variant === 'navy' ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {subtitle}
            </div>
          )}
        </div>

        {Icon && (
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconStyles[variant]}`}
          >
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  );
};
