import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummaryStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Total collections today and this month
    const paymentsThisMonth = await this.prisma.payment.aggregate({
      where: {
        isReversed: false,
        paymentDate: { gte: startOfMonth },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    const paymentsToday = await this.prisma.payment.aggregate({
      where: {
        isReversed: false,
        paymentDate: { gte: startOfToday },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    // 2. Active customers & active groups count
    const activeCustomersCount = await this.prisma.customer.count({
      where: { isActive: true },
    });

    const activeGroupsCount = await this.prisma.chitGroup.count({
      where: { status: 'ACTIVE' },
    });

    // 3. Foreman commission earned from auctions to date
    const auctionsTotal = await this.prisma.auction.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { foremanCommission: true },
      _count: { id: true },
    });

    // 4. Calculate total outstanding dues across all active groups
    const activeGroups = await this.prisma.chitGroup.findMany({
      where: { status: 'ACTIVE' },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
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
    for (const group of activeGroups) {
      const activeMembersCount = group.memberships.length;
      for (const inst of group.installments) {
        if (inst.monthNumber <= group.currentMonth) {
          const expectedTotalForInst = Number(inst.payableAmount) * activeMembersCount;
          const collectedForInst = inst.paymentAllocations.reduce(
            (sum, a) => sum + Number(a.allocatedAmount),
            0,
          );
          if (collectedForInst < expectedTotalForInst) {
            totalPendingDues += expectedTotalForInst - collectedForInst;
          }
        }
      }
    }

    // 5. Recent collections (latest 6 manual records)
    const recentCollections = await this.prisma.payment.findMany({
      where: { isReversed: false },
      orderBy: { paymentDate: 'desc' },
      take: 6,
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

    // 6. Upcoming auctions or next group dates
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
        collectionsThisMonth: Number(paymentsThisMonth._sum.amount ?? 0),
        collectionsCountThisMonth: paymentsThisMonth._count.id,
        collectionsToday: Number(paymentsToday._sum.amount ?? 0),
        collectionsCountToday: paymentsToday._count.id,
        totalPendingDues,
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
