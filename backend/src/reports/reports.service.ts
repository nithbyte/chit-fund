import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Daily Collection Report
  async getDailyCollectionReport(dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const end = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    const payments = await this.prisma.payment.findMany({
      where: {
        paymentDate: { gte: start, lte: end },
      },
      include: {
        customer: true,
        allocations: {
          include: {
            installment: { include: { chitGroup: true } },
            membership: true,
          },
        },
      },
      orderBy: { paymentDate: 'asc' },
    });

    let cashTotal = 0;
    let upiTotal = 0;
    let bankTotal = 0;
    let validTotal = 0;
    let reversedTotal = 0;

    const items = payments.map((p) => {
      const amt = Number(p.amount);
      if (p.isReversed) {
        reversedTotal += amt;
      } else {
        validTotal += amt;
        if (p.paymentMode === 'CASH') cashTotal += amt;
        else if (p.paymentMode === 'UPI') upiTotal += amt;
        else if (p.paymentMode === 'BANK_TRANSFER' || p.paymentMode === 'CHEQUE') bankTotal += amt;
      }

      return {
        id: p.id,
        receiptNumber: p.receiptNumber,
        paymentDate: p.paymentDate,
        customerCode: p.customer.customerCode,
        customerName: p.customer.fullName,
        phone: p.customer.phone,
        amount: amt,
        paymentMode: p.paymentMode,
        transactionRef: p.transactionRef,
        isReversed: p.isReversed,
        reversalReason: p.reversalReason,
        allocationsCount: p.allocations.length,
      };
    });

    return {
      reportDate: start.toISOString().split('T')[0],
      summary: {
        totalReceipts: payments.length,
        validReceipts: payments.filter((p) => !p.isReversed).length,
        reversedReceipts: payments.filter((p) => p.isReversed).length,
        cashTotal,
        upiTotal,
        bankTotal,
        validTotal,
        reversedTotal,
      },
      items,
    };
  }

  // 2. Date Range Collections Report
  async getDateRangeReport(startDateStr: string, endDateStr: string) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    const payments = await this.prisma.payment.findMany({
      where: {
        paymentDate: { gte: start, lte: end },
        isReversed: false,
      },
      include: {
        customer: true,
        allocations: {
          include: {
            installment: { include: { chitGroup: true } },
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });

    let totalAmount = 0;
    let cashTotal = 0;
    let upiTotal = 0;
    let bankTotal = 0;

    for (const p of payments) {
      const amt = Number(p.amount);
      totalAmount += amt;
      if (p.paymentMode === 'CASH') cashTotal += amt;
      else if (p.paymentMode === 'UPI') upiTotal += amt;
      else if (p.paymentMode === 'BANK_TRANSFER' || p.paymentMode === 'CHEQUE') bankTotal += amt;
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      totals: {
        count: payments.length,
        totalAmount,
        cashTotal,
        upiTotal,
        bankTotal,
      },
      items: payments.map((p) => ({
        id: p.id,
        receiptNumber: p.receiptNumber,
        paymentDate: p.paymentDate,
        customerCode: p.customer.customerCode,
        customerName: p.customer.fullName,
        amount: Number(p.amount),
        paymentMode: p.paymentMode,
        transactionRef: p.transactionRef,
      })),
    };
  }

  // 3. Customer Outstanding Ledger Report
  async getCustomerOutstandingReport() {
    const customers = await this.prisma.customer.findMany({
      where: { isActive: true },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            chitGroup: {
              include: {
                installments: {
                  include: {
                    paymentAllocations: {
                      where: { payment: { isReversed: false } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { customerCode: 'asc' },
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let portfolioTotalDue = 0;
    let portfolioOverdue = 0;

    const items = customers.map((c) => {
      let totalDue = 0;
      let overdueAmount = 0;
      let overdueCount = 0;
      let activeChitsCount = c.memberships.length;

      for (const mem of c.memberships) {
        const group = mem.chitGroup;
        for (const inst of group.installments) {
          if (inst.monthNumber <= group.currentMonth) {
            const payable = Number(inst.payableAmount);
            const paid = inst.paymentAllocations
              .filter((a) => a.membershipId === mem.id)
              .reduce((sum, a) => sum + Number(a.allocatedAmount), 0);

            const remaining = Math.max(0, payable - paid);
            if (remaining > 0.01) {
              totalDue += remaining;
              if (new Date(inst.dueDate) < now) {
                overdueAmount += remaining;
                overdueCount++;
              }
            }
          }
        }
      }

      portfolioTotalDue += totalDue;
      portfolioOverdue += overdueAmount;

      return {
        customerId: c.id,
        customerCode: c.customerCode,
        fullName: c.fullName,
        phone: c.phone,
        address: c.address,
        activeChitsCount,
        totalDue,
        overdueAmount,
        overdueCount,
      };
    });

    return {
      summary: {
        totalCustomers: customers.length,
        portfolioTotalDue,
        portfolioOverdue,
      },
      items: items.filter((i) => i.totalDue > 0),
    };
  }

  // 4. Group-Wise Performance Report
  async getGroupWiseReport() {
    const groups = await this.prisma.chitGroup.findMany({
      orderBy: { groupCode: 'asc' },
      include: {
        memberships: {
          include: { customer: true },
        },
        installments: {
          include: {
            paymentAllocations: {
              where: { payment: { isReversed: false } },
            },
          },
        },
        auctions: true,
      },
    });

    const items = groups.map((g) => {
      let totalInstallmentExpected = 0;
      let totalCollected = 0;

      for (const inst of g.installments) {
        if (inst.monthNumber <= g.currentMonth) {
          totalInstallmentExpected += Number(inst.payableAmount) * g.memberships.length;
          const collectedForInst = inst.paymentAllocations.reduce(
            (sum, a) => sum + Number(a.allocatedAmount),
            0,
          );
          totalCollected += collectedForInst;
        }
      }

      const totalPending = Math.max(0, totalInstallmentExpected - totalCollected);
      const collectionEfficiency =
        totalInstallmentExpected > 0
          ? ((totalCollected / totalInstallmentExpected) * 100).toFixed(1)
          : '100.0';

      return {
        id: g.id,
        groupCode: g.groupCode,
        name: g.name,
        chitType: g.chitType,
        totalValue: Number(g.totalValue),
        monthlyContribution: Number(g.monthlyContribution),
        currentMonth: g.currentMonth,
        totalMonths: g.totalMonths,
        status: g.status,
        enrolledMembers: g.memberships.length,
        totalInstallmentExpected,
        totalCollected,
        totalPending,
        collectionEfficiency: Number(collectionEfficiency),
        auctionsHeld: g.auctions.length,
      };
    });

    return items;
  }

  // 5. Payment Reversals Auditable Report
  async getReversalsReport(startDateStr?: string, endDateStr?: string) {
    const where: any = { isReversed: true };
    if (startDateStr || endDateStr) {
      where.reversedAt = {};
      if (startDateStr) where.reversedAt.gte = new Date(startDateStr);
      if (endDateStr) where.reversedAt.lte = new Date(endDateStr);
    }

    const reversedPayments = await this.prisma.payment.findMany({
      where,
      orderBy: { reversedAt: 'desc' },
      include: {
        customer: true,
        receivedBy: {
          select: { fullName: true },
        },
      },
    });

    let totalReversedAmount = 0;
    for (const p of reversedPayments) {
      totalReversedAmount += Number(p.amount);
    }

    return {
      count: reversedPayments.length,
      totalReversedAmount,
      items: reversedPayments.map((p) => ({
        id: p.id,
        receiptNumber: p.receiptNumber,
        originalPaymentDate: p.paymentDate,
        reversedAt: p.reversedAt,
        reversalReason: p.reversalReason,
        customerCode: p.customer.customerCode,
        customerName: p.customer.fullName,
        amount: Number(p.amount),
        paymentMode: p.paymentMode,
        receivedBy: p.receivedBy.fullName,
      })),
    };
  }

  // 6. Customer Account Statement
  async getCustomerStatement(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        memberships: {
          include: {
            chitGroup: {
              include: {
                installments: {
                  orderBy: { monthNumber: 'asc' },
                  include: {
                    paymentAllocations: {
                      where: {
                        membership: { customerId },
                        payment: { isReversed: false },
                      },
                      include: { payment: true },
                    },
                  },
                },
              },
            },
          },
        },
        payments: {
          orderBy: { paymentDate: 'asc' },
          include: {
            allocations: {
              include: {
                installment: { include: { chitGroup: true } },
              },
            },
          },
        },
      },
    });

    if (!customer) throw new NotFoundException(`Customer ${customerId} not found`);

    let totalPaid = 0;
    let totalPayableToDate = 0;

    for (const mem of customer.memberships) {
      const g = mem.chitGroup;
      for (const inst of g.installments) {
        if (inst.monthNumber <= g.currentMonth) {
          totalPayableToDate += Number(inst.payableAmount);
        }
      }
    }

    for (const p of customer.payments) {
      if (!p.isReversed) {
        totalPaid += Number(p.amount);
      }
    }

    const currentBalanceDue = Math.max(0, totalPayableToDate - totalPaid);

    return {
      customer: {
        id: customer.id,
        customerCode: customer.customerCode,
        fullName: customer.fullName,
        phone: customer.phone,
        address: customer.address,
      },
      summary: {
        totalPayableToDate,
        totalPaid,
        currentBalanceDue,
      },
      memberships: customer.memberships.map((m) => ({
        id: m.id,
        groupCode: m.chitGroup.groupCode,
        groupName: m.chitGroup.name,
        ticketNumber: m.ticketNumber,
        isPrized: m.isPrized,
        prizedMonth: m.prizedMonth,
        prizeAmount: m.prizeAmount ? Number(m.prizeAmount) : null,
      })),
      ledgerTransactions: customer.payments.map((p) => ({
        id: p.id,
        receiptNumber: p.receiptNumber,
        date: p.paymentDate,
        amount: Number(p.amount),
        paymentMode: p.paymentMode,
        transactionRef: p.transactionRef,
        isReversed: p.isReversed,
        reversalReason: p.reversalReason,
        allocations: p.allocations.map((a) => ({
          groupCode: a.installment.chitGroup.groupCode,
          monthNumber: a.installment.monthNumber,
          allocatedAmount: Number(a.allocatedAmount),
        })),
      })),
    };
  }
}
