import React from 'react';
import {
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Percent,
  Coins,
  FileText,
  Gavel,
} from 'lucide-react';
import type { CommissionType } from '../../api/chit-groups';

export interface CommissionConfigValue {
  commissionType: CommissionType;
  commissionRate?: number;
  commissionAmount?: number;
  commissionCalculationBase?: string;
  commissionNotes?: string;
  isCommissionConfirmed: boolean;
}

export interface CommissionConfigSectionProps {
  value: CommissionConfigValue;
  onChange: (val: CommissionConfigValue) => void;
  totalChitValue: number;
  installmentAmount: number;
  totalPeriods: number;
  isWeekly?: boolean;
  disabled?: boolean;
}

export interface CommissionOptionMeta {
  type: CommissionType;
  label: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
}

export const COMMISSION_OPTIONS: CommissionOptionMeta[] = [
  {
    type: 'NOT_CONFIGURED',
    label: 'Not Configured (Draft)',
    badge: 'Draft',
    description: 'Commission has not yet been decided. Live financial calculations will remain disabled.',
    icon: <HelpCircle size={15} className="text-slate-400" />,
  },
  {
    type: 'NO_COMMISSION',
    label: 'No Commission',
    badge: '0%',
    description: 'No organizer commission or management fee is charged. All funds remain with members.',
    icon: <CheckCircle2 size={15} className="text-emerald-600" />,
  },
  {
    type: 'PERCENTAGE_OF_CHIT_VALUE',
    label: 'Percentage of Chit Value',
    badge: '% of Chit',
    description: 'Commission is calculated as a percentage of the total stated chit value (e.g. 5% under statutory rules).',
    icon: <Percent size={15} className="text-teal-600" />,
  },
  {
    type: 'PERCENTAGE_OF_EACH_COLLECTION',
    label: 'Percentage of Each Collection',
    badge: '% of Dues',
    description: 'Commission is calculated as a percentage of each eligible installment collection received.',
    icon: <Coins size={15} className="text-indigo-600" />,
  },
  {
    type: 'FIXED_AMOUNT_PER_INSTALLMENT',
    label: 'Fixed Amount per Installment',
    badge: '₹ / Period',
    description: 'A fixed organizer management fee configured for each installment collection period.',
    icon: <TrendingUp size={15} className="text-blue-600" />,
  },
  {
    type: 'FIXED_AMOUNT_PER_CHIT_GROUP',
    label: 'Fixed Amount per Chit Group',
    badge: 'Flat Fee',
    description: 'A one-time fixed organizer fee for managing the entire duration of the chit group.',
    icon: <Coins size={15} className="text-purple-600" />,
  },
  {
    type: 'AUCTION_BASED_EARNINGS',
    label: 'Auction-Based Earnings',
    badge: 'Auction Spread',
    description: 'Earnings depend on the configured auction rules without assuming the organizer owns the bid discount.',
    icon: <Gavel size={15} className="text-amber-600" />,
  },
  {
    type: 'CUSTOM_OTHER',
    label: 'Custom / Other',
    badge: 'Custom',
    description: 'The owner records a specific commission method and calculation rules governed by the chit agreement.',
    icon: <FileText size={15} className="text-rose-600" />,
  },
];

export function calculateCommissionEstimate(
  config: CommissionConfigValue,
  totalChitValue: number,
  installmentAmount: number,
  totalPeriods: number,
): { estimateINR: number | null; label: string; details: string; baseExplanation: string } {
  switch (config.commissionType) {
    case 'NO_COMMISSION':
      return {
        estimateINR: 0,
        label: 'Zero Commission Configured',
        details: 'No organizer fee will be charged to this group or its members.',
        baseExplanation: 'Calculation Base: None (0.00% charged).',
      };

    case 'PERCENTAGE_OF_CHIT_VALUE': {
      const rate = Number(config.commissionRate ?? 0);
      const est = (totalChitValue * rate) / 100;
      const perPeriod = totalPeriods > 0 ? est / totalPeriods : est;
      return {
        estimateINR: est,
        label: `${rate}% of Stated Chit Value`,
        details: `₹${est.toLocaleString('en-IN')} illustrative estimate based on stated chit value of ₹${totalChitValue.toLocaleString('en-IN')} (~₹${perPeriod.toLocaleString('en-IN', { maximumFractionDigits: 0 })} per period across ${totalPeriods} periods).`,
        baseExplanation: `Calculation Base: Stated Chit Value (₹${totalChitValue.toLocaleString('en-IN')}).`,
      };
    }

    case 'PERCENTAGE_OF_EACH_COLLECTION': {
      const rate = Number(config.commissionRate ?? 0);
      const poolPerPeriod = installmentAmount * totalPeriods;
      const perPeriodEstimate = (poolPerPeriod * rate) / 100;
      const totalEst = perPeriodEstimate * totalPeriods;
      return {
        estimateINR: totalEst,
        label: `${rate}% of Eligible Collections`,
        details: `₹${totalEst.toLocaleString('en-IN')} illustrative estimate (~₹${perPeriodEstimate.toLocaleString('en-IN', { maximumFractionDigits: 0 })} per collection cycle based on ${totalPeriods} scheduled installments).`,
        baseExplanation: `Calculation Base: Installment collections received (₹${installmentAmount.toLocaleString('en-IN')} per member per period).`,
      };
    }

    case 'FIXED_AMOUNT_PER_INSTALLMENT': {
      const amount = Number(config.commissionAmount ?? 0);
      const totalEst = amount * totalPeriods;
      return {
        estimateINR: totalEst,
        label: `₹${amount.toLocaleString('en-IN')} per Installment Cycle`,
        details: `₹${totalEst.toLocaleString('en-IN')} illustrative estimate across ${totalPeriods} scheduled installments.`,
        baseExplanation: `Calculation Base: Fixed flat fee applied per collection cycle upon completion.`,
      };
    }

    case 'FIXED_AMOUNT_PER_CHIT_GROUP': {
      const amount = Number(config.commissionAmount ?? 0);
      return {
        estimateINR: amount,
        label: `₹${amount.toLocaleString('en-IN')} Flat Group Fee`,
        details: `₹${amount.toLocaleString('en-IN')} one-time organizer management fee for the entire group duration.`,
        baseExplanation: `Calculation Base: Fixed organizer fee across the entire group lifecycle.`,
      };
    }

    case 'AUCTION_BASED_EARNINGS': {
      const rate = Number(config.commissionRate ?? 5.0);
      const est = (totalChitValue * rate) / 100;
      return {
        estimateINR: est,
        label: `Foreman Auction Share (up to ~${rate}%)`,
        details: `~₹${est.toLocaleString('en-IN')} illustrative estimate based on maximum foreman auction margin. Actual earnings strictly depend on monthly bidding discounts. Remaining bid discount is distributed as member dividend.`,
        baseExplanation: `Calculation Base: Winning auction bid discount spread per monthly auction.`,
      };
    }

    case 'CUSTOM_OTHER': {
      const amount = config.commissionAmount !== undefined ? Number(config.commissionAmount) : null;
      return {
        estimateINR: amount,
        label: 'Custom Agreement Scheme',
        details: config.commissionNotes?.trim()
          ? `Agreed terms: "${config.commissionNotes.trim()}"`
          : 'Specific custom calculation formula must be entered and confirmed before financial accounting is activated.',
        baseExplanation: `Calculation Base: ${config.commissionCalculationBase || 'Custom Scheme Agreement terms'}.`,
      };
    }

    case 'NOT_CONFIGURED':
    default:
      return {
        estimateINR: null,
        label: 'Commission Not Configured',
        details: 'Terms are currently unconfirmed. Financial commission calculations will remain disabled.',
        baseExplanation: 'Calculation Base: Pending owner confirmation.',
      };
  }
}

export const CommissionConfigSection: React.FC<CommissionConfigSectionProps> = ({
  value,
  onChange,
  totalChitValue,
  installmentAmount,
  totalPeriods,
  disabled = false,
}) => {
  const selectedMeta =
    COMMISSION_OPTIONS.find((opt) => opt.type === value.commissionType) || COMMISSION_OPTIONS[0];

  const estimate = calculateCommissionEstimate(
    value,
    totalChitValue,
    installmentAmount,
    totalPeriods,
  );

  const handleTypeChange = (newType: CommissionType) => {
    let newRate = value.commissionRate;
    let newAmount = value.commissionAmount;
    let newBase = value.commissionCalculationBase;

    if (newType === 'NO_COMMISSION' || newType === 'NOT_CONFIGURED') {
      newRate = 0;
      newAmount = 0;
      newBase = '';
    } else if (newType === 'PERCENTAGE_OF_CHIT_VALUE') {
      newRate = value.commissionRate !== undefined && value.commissionRate > 0 ? value.commissionRate : 5.0;
      newBase = 'CHIT_VALUE';
    } else if (newType === 'PERCENTAGE_OF_EACH_COLLECTION') {
      newRate = value.commissionRate !== undefined && value.commissionRate > 0 ? value.commissionRate : 4.0;
      newBase = 'COLLECTIONS';
    } else if (newType === 'FIXED_AMOUNT_PER_INSTALLMENT') {
      newAmount = value.commissionAmount !== undefined && value.commissionAmount > 0 ? value.commissionAmount : 250;
      newBase = 'PER_INSTALLMENT';
    } else if (newType === 'FIXED_AMOUNT_PER_CHIT_GROUP') {
      newAmount = value.commissionAmount !== undefined && value.commissionAmount > 0 ? value.commissionAmount : 5000;
      newBase = 'PER_GROUP';
    } else if (newType === 'AUCTION_BASED_EARNINGS') {
      newRate = value.commissionRate !== undefined && value.commissionRate > 0 ? value.commissionRate : 5.0;
      newBase = 'AUCTION_SPREAD';
    } else if (newType === 'CUSTOM_OTHER') {
      newBase = 'CUSTOM_FORMULA';
    }

    onChange({
      ...value,
      commissionType: newType,
      commissionRate: newRate,
      commissionAmount: newAmount,
      commissionCalculationBase: newBase,
      // If switched to Not Configured, reset confirmation
      isCommissionConfirmed: newType === 'NOT_CONFIGURED' ? false : value.isCommissionConfirmed,
    });
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3.5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
            %
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Commission & Earnings Configuration
            </h4>
            <p className="text-[11px] text-slate-500">
              Configure how organizer fees and earnings are calculated for this scheme.
            </p>
          </div>
        </div>

        {value.isCommissionConfirmed ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={11} />
            <span>Confirmed</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle size={11} />
            <span>Unconfirmed Terms</span>
          </span>
        )}
      </div>

      {/* 1. Commission Type Dropdown */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Commission Type *
        </label>
        <div className="relative">
          <select
            disabled={disabled}
            value={value.commissionType}
            onChange={(e) => handleTypeChange(e.target.value as CommissionType)}
            className="w-full px-3 py-2 text-xs border rounded-lg bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none font-semibold text-slate-900 pr-8"
          >
            {COMMISSION_OPTIONS.map((opt) => (
              <option key={opt.type} value={opt.type}>
                {opt.label} — [{opt.badge}]
              </option>
            ))}
          </select>
        </div>

        {/* Short, plain-language explanation under dropdown */}
        <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
          <div className="mt-0.5 shrink-0">{selectedMeta.icon}</div>
          <div>
            <span className="font-semibold text-slate-800">{selectedMeta.label}: </span>
            <span>{selectedMeta.description}</span>
          </div>
        </div>
      </div>

      {/* 2. Dynamic Conditional Fields */}
      {/* A. Percentage Options */}
      {(value.commissionType === 'PERCENTAGE_OF_CHIT_VALUE' ||
        value.commissionType === 'PERCENTAGE_OF_EACH_COLLECTION') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Commission Rate (%) *
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.05"
                min="0"
                max="100"
                required
                disabled={disabled}
                value={value.commissionRate ?? ''}
                onChange={(e) =>
                  onChange({
                    ...value,
                    commissionRate: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
                placeholder="e.g. 5.0"
                className="w-full px-3 py-2 text-xs border rounded-lg bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none font-bold tabular-nums pr-8"
              />
              <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Statutory ceiling under Chit Funds Act is typically 5% of chit value.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Calculation Base
            </label>
            <div className="px-3 py-2 text-xs border rounded-lg bg-slate-100 text-slate-700 font-medium">
              {value.commissionType === 'PERCENTAGE_OF_CHIT_VALUE'
                ? `Stated Chit Value (₹${totalChitValue.toLocaleString('en-IN')})`
                : `Installment Collection (₹${installmentAmount.toLocaleString('en-IN')} / member)`}
            </div>
            <span className="text-[10px] text-teal-800 mt-1 block font-medium">
              ✓ Base verified against scheme parameters
            </span>
          </div>
        </div>
      )}

      {/* B. Fixed Amount Options */}
      {(value.commissionType === 'FIXED_AMOUNT_PER_INSTALLMENT' ||
        value.commissionType === 'FIXED_AMOUNT_PER_CHIT_GROUP') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {value.commissionType === 'FIXED_AMOUNT_PER_INSTALLMENT'
                ? 'Fixed Fee per Installment (₹) *'
                : 'Total Fixed Fee for Group (₹) *'}
            </label>
            <div className="relative">
              <input
                type="number"
                step="50"
                min="0"
                required
                disabled={disabled}
                value={value.commissionAmount ?? ''}
                onChange={(e) =>
                  onChange({
                    ...value,
                    commissionAmount: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
                placeholder="e.g. 500"
                className="w-full px-3 py-2 text-xs border rounded-lg bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none font-bold tabular-nums pl-6"
              />
              <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₹</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              When Fee Applies
            </label>
            <div className="px-3 py-2 text-xs border rounded-lg bg-slate-100 text-slate-700 font-medium">
              {value.commissionType === 'FIXED_AMOUNT_PER_INSTALLMENT'
                ? `Accrues once per installment cycle (${totalPeriods} cycles total)`
                : `Accrues across the full lifecycle of this ${totalPeriods}-period group`}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Separate from customer contribution deposits
            </span>
          </div>
        </div>
      )}

      {/* C. Auction-Based Earnings */}
      {value.commissionType === 'AUCTION_BASED_EARNINGS' && (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Foreman Auction Commission Rate (%) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  disabled={disabled}
                  value={value.commissionRate ?? 5.0}
                  onChange={(e) =>
                    onChange({ ...value, commissionRate: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none font-bold tabular-nums pr-8"
                />
                <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Standard statutory foreman quota deduction
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Discount Sharing Rule
              </label>
              <div className="px-3 py-2 text-xs border rounded-lg bg-slate-100 text-slate-700 font-medium">
                Winning Bid Discount - Foreman Commission = Member Dividend
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Organizer does NOT automatically retain 100% of bid discount.
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Auction & Spread Notes (Optional)
            </label>
            <input
              type="text"
              disabled={disabled}
              value={value.commissionNotes || ''}
              onChange={(e) => onChange({ ...value, commissionNotes: e.target.value })}
              placeholder="e.g. Reverse auction bidding spread, minimum discount ₹10,000"
              className="w-full px-3 py-2 text-xs border rounded-lg bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* D. Custom / Other */}
      {value.commissionType === 'CUSTOM_OTHER' && (
        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Custom Commission Calculation Rules *
            </label>
            <textarea
              rows={2}
              required
              disabled={disabled}
              value={value.commissionNotes || ''}
              onChange={(e) => onChange({ ...value, commissionNotes: e.target.value })}
              placeholder="Describe the agreed formula, basis, and conditions under which organizer fees are recognized..."
              className="w-full px-3 py-2 text-xs border rounded-lg bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
            />
            <span className="text-[10px] text-amber-700 font-medium mt-0.5 block">
              ⚠️ Custom schemes require explicit calculation documentation before financial activation.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Illustrative Baseline Amount (₹) (Optional)
              </label>
              <input
                type="number"
                disabled={disabled}
                value={value.commissionAmount ?? ''}
                onChange={(e) =>
                  onChange({
                    ...value,
                    commissionAmount: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
                placeholder="e.g. 5000"
                className="w-full px-3 py-2 text-xs border rounded-lg bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Calculation Base Tag
              </label>
              <input
                type="text"
                disabled={disabled}
                value={value.commissionCalculationBase || ''}
                onChange={(e) =>
                  onChange({ ...value, commissionCalculationBase: e.target.value })
                }
                placeholder="e.g. Agreement Clause 4.2"
                className="w-full px-3 py-2 text-xs border rounded-lg bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* E. No Commission Notification */}
      {value.commissionType === 'NO_COMMISSION' && (
        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
          <span>
            <strong>Zero Organizer Commission:</strong> No commission deductions will occur. Customer contributions and prize payouts remain 100% distributed among members.
          </span>
        </div>
      )}

      {/* F. Not Configured Banner */}
      {value.commissionType === 'NOT_CONFIGURED' && (
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>Commission Unconfigured:</strong> You may save this scheme as a draft. However, live financial commission deductions and accounting will remain disabled until terms are confirmed.
          </div>
        </div>
      )}

      {/* 3. Live Illustrative Commission Estimate Card */}
      <div className="p-3 rounded-xl border border-teal-200 bg-teal-50/60 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
            Illustrative Commission Estimate
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
            {estimate.label}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-lg font-black text-teal-950 tabular-nums">
            {estimate.estimateINR !== null
              ? `₹${estimate.estimateINR.toLocaleString('en-IN')}`
              : '—'}
          </span>
          <span className="text-[11px] text-teal-700 font-medium">
            (Estimated Full Scheme Lifecycle)
          </span>
        </div>

        <p className="text-[11px] text-slate-600 mt-1 leading-snug">
          {estimate.details}
        </p>

        {/* Required Disclaimer Safeguard */}
        <div className="mt-2 pt-2 border-t border-teal-200/60 text-[10px] text-teal-900 flex items-start gap-1">
          <span className="font-bold text-amber-800 shrink-0">⚠️ Important:</span>
          <span className="text-slate-600">
            This figure is an <em>illustrative estimate only</em>. It is <strong>never</strong> presented as money actually earned or guaranteed. Realized commission is only recognized when collections or auctions are officially recorded and confirmed.
          </span>
        </div>
      </div>

      {/* 4. Owner Confirmation Checkbox */}
      {value.commissionType !== 'NOT_CONFIGURED' && (
        <div className="pt-1">
          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              disabled={disabled}
              checked={value.isCommissionConfirmed}
              onChange={(e) =>
                onChange({ ...value, isCommissionConfirmed: e.target.checked })
              }
              className="mt-0.5 rounded border-slate-300 text-teal-700 focus:ring-teal-600 w-4 h-4 cursor-pointer"
            />
            <div className="text-xs text-slate-700">
              <span className="font-bold text-slate-900">
                Confirm applicable commission terms for this scheme
              </span>
              <p className="text-[10px] text-slate-500 mt-0.5">
                I confirm that these terms follow the scheme agreement and legal requirements. Real commission calculations will only apply to confirmed terms.
              </p>
            </div>
          </label>
        </div>
      )}
    </div>
  );
};
