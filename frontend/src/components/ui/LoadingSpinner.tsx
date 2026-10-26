import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  className = 'py-12',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-slate-500 ${className}`}>
      <Loader2 size={24} className="animate-spin text-teal-600 mb-2" />
      <span className="text-xs font-medium tracking-tight text-slate-600">{message}</span>
    </div>
  );
};
