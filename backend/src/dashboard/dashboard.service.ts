import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface DashboardQueryDto {
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummaryStats(query?: DashboardQueryDto) {
    const now = new Date();
    // Default to today start and end in IST (midnight)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    // Selected Date Range (defaults to current month if not provided)
    const filterStart = query?.startDate ? new Date(query.startDate) : startOfMonth;
    const filterEnd = query?.endDate ? new Date(query.endDate) : todayEnd;

    // 1. Collections Today
    const paymentsToday = await this.prisma.payment.aggregate({
      where: {
        isReversed: false,
        paymentDate: { gte: todayStart, lte: todayEnd },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    // 2. Collections for Selected Date Range
    const paymentsSelectedRange = await this.prisma.payment.aggregate({
      where: {
        isReversed: false,
        paymentDate: { gte: filterStart, lte: filterEnd },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    // 3. Payment Mode Breakdown for Selected Range (Cash, UPI, Bank Transfer)
    const paymentsByMode = await this.prisma.payment.groupBy({
      by: ['paymentMode'],
      where: {
        isReversed: false,
        paymentDate: { gte: filterStart, lte: filterEnd },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    const modeTotals = {
      cash: 0,
      upi: 0,
      bankTransfer: 0,
      cheque: 0,
    };

    paymentsByMode.forEach((item) => {
      const amt = Number(item._sum.amount ?? 0);
      if (item.paymentMode === 'CASH') modeTotals.cash += amt;
      else if (item.paymentMode === 'UPI') modeTotals.upi += amt;
      else if (item.paymentMode === 'BANK_TRANSFER') modeTotals.bankTransfer += amt;
      else if (item.paymentMode === 'CHEQUE') modeTotals.cheque += amt;
    });

    // 4. Active customers & active groups count
    const activeCustomersCount = await this.prisma.customer.count({
      where: { isActive: true },
    });

    const activeGroupsCount = await this.prisma.chitGroup.count({
      where: { status: 'ACTIVE' },
    });

    // 5. Foreman commission earned from auctions to date
    const auctionsTotal = await this.prisma.auction.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { foremanCommission: true },
      _count: { id: true },
    });

    // 6. Scan installments for: Due Today, Overdue, and Total Outstanding Dues
    const activeGroups = await this.prisma.chitGroup.findMany({
      where: { status: 'ACTIVE' },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: { customer: true },
        },
        installments: {
          include: {
            paymentAllocations: {
              where: { payment: { isReversed: false } },
            },
          },
        },
      },
    });

    let totalPendingDues = 0;
    let dueTodayCount = 0;
    let dueTodayAmount = 0;
    let overdueCount = 0;
    let overdueAmount = 0;

    const overdueList: any[] = [];
    const dueTodayList: any[] = [];

    for (const group of activeGroups) {
      for (const inst of group.installments) {
        if (inst.monthNumber <= group.currentMonth) {
          const instDueDate = new Date(inst.dueDate);
          const isDueToday =
            instDueDate.getFullYear() === now.getFullYear() &&
            instDueDate.getMonth() === now.getMonth() &&
            instDueDate.getDate() === now.getDate();
          const isOverdue = instDueDate < todayStart;

          for (const mem of group.memberships) {
            const payable = Number(inst.payableAmount);
            const paidForMem = inst.paymentAllocations
              .filter((a) => a.membershipId === mem.id)
              .reduce((sum, a) => sum + Number(a.allocatedAmount), 0);

            const remaining = payable - paidForMem;
            if (remaining > 0.01) {
              totalPendingDues += remaining;

              const dueItem = {
                customerId: mem.customer.id,
                customerName: mem.customer.fullName,
                customerPhone: mem.customer.phone,
                customerCode: mem.customer.customerCode,
                chitGroupId: group.id,
                groupCode: group.groupCode,
                groupName: group.name,
                ticketNumber: mem.ticketNumber,
                monthNumber: inst.monthNumber,
                dueDate: inst.dueDate,
                remainingDue: remaining,
              };

              if (isDueToday) {
                dueTodayCount++;
                dueTodayAmount += remaining;
                if (dueTodayList.length < 5) dueTodayList.push(dueItem);
              } else if (isOverdue) {
                overdueCount++;
                overdueAmount += remaining;
                if (overdueList.length < 5) overdueList.push(dueItem);
              }
            }
          }
        }
      }
    }

    // 7. Recent Transactions (latest 10 manual collections)
    const recentCollections = await this.prisma.payment.findMany({
      where: { isReversed: false },
      orderBy: { paymentDate: 'desc' },
      take: 10,
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            customerCode: true,
          },
        },
      },
    });

    // 8. Active Batches
    const upcomingGroups = await this.prisma.chitGroup.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        groupCode: true,
        name: true,
        currentMonth: true,
        totalMonths: true,
        auctionDayOfMonth: true,
        monthlyContribution: true,
      },
      take: 4,
    });

    return {
      financials: {
        collectionsToday: Number(paymentsToday._sum.amount ?? 0),
        collectionsCountToday: paymentsToday._count.id,
        collectionsSelectedRange: Number(paymentsSelectedRange._sum.amount ?? 0),
        collectionsCountSelectedRange: paymentsSelectedRange._count.id,
        rangeStartDate: filterStart.toISOString(),
        rangeEndDate: filterEnd.toISOString(),
        modeTotals,
        totalPendingDues,
        dueToday: {
          count: dueTodayCount,
          amount: dueTodayAmount,
          items: dueTodayList,
        },
        overdue: {
          count: overdueCount,
          amount: overdueAmount,
          items: overdueList,
        },
        foremanCommissionEarned: Number(auctionsTotal._sum.foremanCommission ?? 0),
        auctionsConducted: auctionsTotal._count.id,
      },
      operations: {
        activeCustomersCount,
        activeGroupsCount,
      },
      recentCollections: recentCollections.map((p) => ({
        id: p.id,
        receiptNumber: p.receiptNumber,
        customerName: p.customer.fullName,
        customerPhone: p.customer.phone,
        customerCode: p.customer.customerCode,
        amount: Number(p.amount),
        paymentMode: p.paymentMode,
        paymentDate: p.paymentDate,
        transactionRef: p.transactionRef,
      })),
      upcomingGroups,
    };
  }
}
