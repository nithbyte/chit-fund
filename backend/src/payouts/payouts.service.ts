import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RecordPayoutDto } from './dto/record-payout.dto.js';
import { PayoutStatus } from '@prisma/client';

@Injectable()
export class PayoutsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(chitGroupId?: string, status?: PayoutStatus) {
    const where: any = {};
    if (chitGroupId) where.chitGroupId = chitGroupId;
    if (status) where.status = status;

    const payouts = await this.prisma.payout.findMany({
      where,
      orderBy: { payoutDate: 'desc' },
      include: {
        chitGroup: {
          select: {
            id: true,
            groupCode: true,
            name: true,
            totalValue: true,
          },
        },
        membership: {
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
        },
        auction: {
          select: {
            id: true,
            monthNumber: true,
            auctionDate: true,
            winningBidAmount: true,
            foremanCommission: true,
            netPrizeAmount: true,
          },
        },
        disbursedBy: {
          select: {
            id: true,
            fullName: true,
            username: true,
          },
        },
      },
    });

    return payouts.map((p) => ({
      id: p.id,
      voucherNumber: p.voucherNumber,
      chitGroupId: p.chitGroupId,
      groupCode: p.chitGroup.groupCode,
      groupName: p.chitGroup.name,
      membershipId: p.membershipId,
      customerId: p.membership.customer.id,
      customerCode: p.membership.customer.customerCode,
      winnerName: p.membership.customer.fullName,
      winnerPhone: p.membership.customer.phone,
      ticketNumber: p.membership.ticketNumber,
      auctionId: p.auctionId,
      auctionMonth: p.auction.monthNumber,
      grossPrizeAmount: Number(p.grossPrizeAmount),
      deductionAmount: Number(p.deductionAmount),
      netPaidAmount: Number(p.netPaidAmount),
      payoutDate: p.payoutDate,
      paymentMode: p.paymentMode,
      transactionRef: p.transactionRef,
      guarantor1: p.guarantorName1
        ? `${p.guarantorName1}${p.guarantorPhone1 ? ` (${p.guarantorPhone1})` : ''}`
        : null,
      guarantor2: p.guarantorName2
        ? `${p.guarantorName2}${p.guarantorPhone2 ? ` (${p.guarantorPhone2})` : ''}`
        : null,
      guarantorName1: p.guarantorName1,
      guarantorPhone1: p.guarantorPhone1,
      guarantorName2: p.guarantorName2,
      guarantorPhone2: p.guarantorPhone2,
      status: p.status,
      disbursedBy: p.disbursedBy.fullName,
      notes: p.notes,
      createdAt: p.createdAt,
    }));
  }

  async findOne(id: string) {
    const p = await this.prisma.payout.findUnique({
      where: { id },
      include: {
        chitGroup: true,
        membership: {
          include: { customer: true },
        },
        auction: true,
        disbursedBy: {
          select: { id: true, fullName: true, username: true },
        },
      },
    });

    if (!p) {
      throw new NotFoundException(`Payout voucher ${id} not found`);
    }

    return {
      id: p.id,
      voucherNumber: p.voucherNumber,
      chitGroupId: p.chitGroupId,
      groupCode: p.chitGroup.groupCode,
      groupName: p.chitGroup.name,
      membershipId: p.membershipId,
      customerId: p.membership.customer.id,
      customerCode: p.membership.customer.customerCode,
      winnerName: p.membership.customer.fullName,
      winnerPhone: p.membership.customer.phone,
      winnerAddress: p.membership.customer.address,
      ticketNumber: p.membership.ticketNumber,
      auctionId: p.auctionId,
      auctionMonth: p.auction.monthNumber,
      grossPrizeAmount: Number(p.grossPrizeAmount),
      deductionAmount: Number(p.deductionAmount),
      netPaidAmount: Number(p.netPaidAmount),
      payoutDate: p.payoutDate,
      paymentMode: p.paymentMode,
      transactionRef: p.transactionRef,
      guarantorName1: p.guarantorName1,
      guarantorPhone1: p.guarantorPhone1,
      guarantorName2: p.guarantorName2,
      guarantorPhone2: p.guarantorPhone2,
      status: p.status,
      disbursedBy: p.disbursedBy.fullName,
      notes: p.notes,
      createdAt: p.createdAt,
    };
  }

  async recordPayout(dto: RecordPayoutDto, disbursedById: string) {
    // 1. Verify group
    const group = await this.prisma.chitGroup.findUnique({
      where: { id: dto.chitGroupId },
    });
    if (!group) throw new NotFoundException(`Chit group ${dto.chitGroupId} not found`);

    // 2. Verify membership
    const membership = await this.prisma.membership.findUnique({
      where: { id: dto.membershipId },
      include: { customer: true },
    });
    if (!membership) throw new NotFoundException(`Membership ${dto.membershipId} not found`);
    if (membership.chitGroupId !== dto.chitGroupId) {
      throw new BadRequestException('Membership does not belong to the selected chit group');
    }

    // 3. Verify auction
    const auction = await this.prisma.auction.findUnique({
      where: { id: dto.auctionId },
    });
    if (!auction) throw new NotFoundException(`Auction ${dto.auctionId} not found`);
    if (auction.chitGroupId !== dto.chitGroupId) {
      throw new BadRequestException('Auction does not belong to the selected chit group');
    }

    // 4. Check if payout already exists for this auction
    const existingPayout = await this.prisma.payout.findFirst({
      where: { auctionId: dto.auctionId },
    });
    if (existingPayout) {
      throw new ConflictException(
        `Payout already disbursed for Month ${auction.monthNumber} under voucher ${existingPayout.voucherNumber}`,
      );
    }

    // 5. Generate unique voucher number: PAY-YYYYMM-XXXX
    const payoutDate = dto.payoutDate ? new Date(dto.payoutDate) : new Date();
    const yyyymm = `${payoutDate.getFullYear()}${String(payoutDate.getMonth() + 1).padStart(2, '0')}`;
    const countThisMonth = await this.prisma.payout.count({
      where: {
        voucherNumber: { startsWith: `PAY-${yyyymm}` },
      },
    });
    const voucherNumber = `PAY-${yyyymm}-${String(countThisMonth + 1).padStart(4, '0')}`;

    // 6. Execute atomic database transaction
    return this.prisma.$transaction(async (tx) => {
      const payout = await tx.payout.create({
        data: {
          chitGroupId: dto.chitGroupId,
          membershipId: dto.membershipId,
          auctionId: dto.auctionId,
          voucherNumber,
          grossPrizeAmount: dto.grossPrizeAmount,
          deductionAmount: dto.deductionAmount || 0,
          netPaidAmount: dto.netPaidAmount,
          payoutDate,
          paymentMode: dto.paymentMode,
          transactionRef: dto.transactionRef?.trim() || null,
          guarantorName1: dto.guarantorName1?.trim() || null,
          guarantorPhone1: dto.guarantorPhone1?.trim() || null,
          guarantorName2: dto.guarantorName2?.trim() || null,
          guarantorPhone2: dto.guarantorPhone2?.trim() || null,
          status: dto.status || PayoutStatus.DISBURSED,
          disbursedById,
          notes: dto.notes?.trim() || null,
        },
      });

      // Update membership prized status
      await tx.membership.update({
        where: { id: dto.membershipId },
        data: {
          isPrized: true,
          prizedMonth: auction.monthNumber,
          prizeAmount: dto.netPaidAmount,
        },
      });

      // Record audit log
      await tx.auditLog.create({
        data: {
          entityType: 'PAYOUT',
          entityId: payout.id,
          action: 'PAYOUT_DISBURSED',
          performedById: disbursedById,
          metadata: {
            voucherNumber: payout.voucherNumber,
            groupCode: group.groupCode,
            ticketNumber: membership.ticketNumber,
            customer: membership.customer.fullName,
            netPaidAmount: dto.netPaidAmount,
          },
        },
      });

      return payout;
    });
  }
}
