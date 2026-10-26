import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SaveReconciliationDto } from './dto/save-reconciliation.dto.js';

@Injectable()
export class ReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  async getDailyReport(dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    // 1. Fetch all collections recorded on this day
    const payments = await this.prisma.payment.findMany({
      where: {
        paymentDate: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { paymentDate: 'asc' },
      include: {
        customer: {
          select: {
            id: true,
            customerCode: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    let systemCashTotal = 0;
    let systemUpiTotal = 0;
    let systemBankTotal = 0;
    let systemTotal = 0;
    let reversedTotal = 0;

    const validTransactions: any[] = [];
    const reversedTransactions: any[] = [];

    for (const p of payments) {
      const amt = Number(p.amount);
      if (p.isReversed) {
        reversedTotal += amt;
        reversedTransactions.push({
          id: p.id,
          receiptNumber: p.receiptNumber,
          customerName: p.customer.fullName,
          customerCode: p.customer.customerCode,
          amount: amt,
          paymentMode: p.paymentMode,
          paymentDate: p.paymentDate,
          reversalReason: p.reversalReason,
          reversedAt: p.reversedAt,
        });
      } else {
        systemTotal += amt;
        if (p.paymentMode === 'CASH') systemCashTotal += amt;
        else if (p.paymentMode === 'UPI') systemUpiTotal += amt;
        else systemBankTotal += amt;

        validTransactions.push({
          id: p.id,
          receiptNumber: p.receiptNumber,
          customerName: p.customer.fullName,
          customerCode: p.customer.customerCode,
          amount: amt,
          paymentMode: p.paymentMode,
          paymentDate: p.paymentDate,
          transactionRef: p.transactionRef,
        });
      }
    }

    // 2. Query Expenses on this day (separate from collections)
    const expenses = await this.prisma.expense.findMany({
      where: {
        expenseDate: { gte: dayStart, lte: dayEnd },
      },
    });

    let totalExpenses = 0;
    let cashExpenses = 0;
    for (const exp of expenses) {
      const amt = Number(exp.amount);
      totalExpenses += amt;
      if (exp.paymentMode === 'CASH') cashExpenses += amt;
    }

    // 3. Query Payouts on this day (separate from collections)
    const payouts = await this.prisma.payout.findMany({
      where: {
        payoutDate: { gte: dayStart, lte: dayEnd },
      },
      include: {
        membership: {
          include: { customer: true },
        },
      },
    });

    let totalPayouts = 0;
    let cashPayouts = 0;
    for (const pay of payouts) {
      const amt = Number(pay.netPaidAmount);
      totalPayouts += amt;
      if (pay.paymentMode === 'CASH') cashPayouts += amt;
    }

    // 4. Fetch existing reconciliation record if saved
    const savedRecord = await this.prisma.dailyReconciliation.findUnique({
      where: { reconciliationDate: dayStart },
      include: {
        reconciledBy: {
          select: { fullName: true, username: true },
        },
      },
    });

    const actualCash = savedRecord?.actualCashCounted !== null && savedRecord?.actualCashCounted !== undefined
      ? Number(savedRecord.actualCashCounted)
      : null;
    const actualUpi = savedRecord?.actualUpiVerified !== null && savedRecord?.actualUpiVerified !== undefined
      ? Number(savedRecord.actualUpiVerified)
      : null;
    const actualBank = savedRecord?.actualBankVerified !== null && savedRecord?.actualBankVerified !== undefined
      ? Number(savedRecord.actualBankVerified)
      : null;

    const discrepancy = {
      cash: actualCash !== null ? actualCash - systemCashTotal : null,
      upi: actualUpi !== null ? actualUpi - systemUpiTotal : null,
      bank: actualBank !== null ? actualBank - systemBankTotal : null,
      total:
        actualCash !== null || actualUpi !== null || actualBank !== null
          ? (actualCash ?? systemCashTotal) +
            (actualUpi ?? systemUpiTotal) +
            (actualBank ?? systemBankTotal) -
            systemTotal
          : null,
    };

    return {
      date: dayStart.toISOString().split('T')[0],
      systemTotals: {
        systemCashTotal,
        systemUpiTotal,
        systemBankTotal,
        systemTotal,
        validCount: validTransactions.length,
        reversedCount: reversedTransactions.length,
        reversedTotal,
      },
      cashFlow: {
        cashCollected: systemCashTotal,
        cashExpenses,
        cashPayouts,
        netCashMovement: systemCashTotal - cashExpenses - cashPayouts,
      },
      operations: {
        totalExpenses,
        expensesCount: expenses.length,
        totalPayouts,
        payoutsCount: payouts.length,
      },
      actuals: {
        actualCashCounted: actualCash,
        actualUpiVerified: actualUpi,
        actualBankVerified: actualBank,
        discrepancyNote: savedRecord?.discrepancyNote ?? null,
        status: savedRecord?.status ?? 'UNRECONCILED',
        reconciledAt: savedRecord?.reconciledAt ?? null,
        reconciledBy: savedRecord?.reconciledBy?.fullName ?? null,
      },
      discrepancy,
      transactions: validTransactions,
      reversals: reversedTransactions,
      expenses: expenses.map((e) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        amount: Number(e.amount),
        paymentMode: e.paymentMode,
      })),
      payouts: payouts.map((p) => ({
        id: p.id,
        voucherNumber: p.voucherNumber,
        winnerName: p.membership.customer.fullName,
        amount: Number(p.netPaidAmount),
        paymentMode: p.paymentMode,
      })),
    };
  }

  async saveDailyReconciliation(dto: SaveReconciliationDto, userId: string) {
    const targetDate = new Date(dto.date);
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    // Calculate current system totals for that date
    const payments = await this.prisma.payment.findMany({
      where: {
        isReversed: false,
        paymentDate: { gte: dayStart, lte: dayEnd },
      },
    });

    let systemCashTotal = 0;
    let systemUpiTotal = 0;
    let systemBankTotal = 0;

    payments.forEach((p) => {
      const amt = Number(p.amount);
      if (p.paymentMode === 'CASH') systemCashTotal += amt;
      else if (p.paymentMode === 'UPI') systemUpiTotal += amt;
      else systemBankTotal += amt;
    });

    const systemTotal = systemCashTotal + systemUpiTotal + systemBankTotal;

    const actualCash = dto.actualCashCounted !== undefined ? dto.actualCashCounted : systemCashTotal;
    const actualUpi = dto.actualUpiVerified !== undefined ? dto.actualUpiVerified : systemUpiTotal;
    const actualBank = dto.actualBankVerified !== undefined ? dto.actualBankVerified : systemBankTotal;

    const diff = Math.abs(actualCash - systemCashTotal) + Math.abs(actualUpi - systemUpiTotal) + Math.abs(actualBank - systemBankTotal);
    const status = diff < 0.01 ? 'RECONCILED' : 'DISCREPANCY';

    const record = await this.prisma.dailyReconciliation.upsert({
      where: { reconciliationDate: dayStart },
      update: {
        systemCashTotal,
        systemUpiTotal,
        systemBankTotal,
        systemTotal,
        actualCashCounted: dto.actualCashCounted ?? null,
        actualUpiVerified: dto.actualUpiVerified ?? null,
        actualBankVerified: dto.actualBankVerified ?? null,
        discrepancyNote: dto.discrepancyNote?.trim() || null,
        status,
        reconciledById: userId,
        reconciledAt: new Date(),
      },
      create: {
        reconciliationDate: dayStart,
        systemCashTotal,
        systemUpiTotal,
        systemBankTotal,
        systemTotal,
        actualCashCounted: dto.actualCashCounted ?? null,
        actualUpiVerified: dto.actualUpiVerified ?? null,
        actualBankVerified: dto.actualBankVerified ?? null,
        discrepancyNote: dto.discrepancyNote?.trim() || null,
        status,
        reconciledById: userId,
        reconciledAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        entityType: 'RECONCILIATION',
        entityId: record.id,
        action: 'DAILY_RECONCILED',
        performedById: userId,
        metadata: {
          date: dto.date,
          status,
          systemTotal,
          actualTotal: actualCash + actualUpi + actualBank,
          discrepancy: (actualCash + actualUpi + actualBank) - systemTotal,
        },
      },
    });

    return this.getDailyReport(dto.date);
  }
}
