import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuctionStatus, CommissionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RecordAuctionDto } from './dto/record-auction.dto.js';

@Injectable()
export class AuctionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(chitGroupId?: string) {
    const where: any = {};
    if (chitGroupId) {
      where.chitGroupId = chitGroupId;
    }

    return this.prisma.auction.findMany({
      where,
      orderBy: { auctionDate: 'desc' },
      include: {
        chitGroup: {
          select: {
            id: true,
            groupCode: true,
            name: true,
            totalValue: true,
          },
        },
        winningMembership: {
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
        },
      },
    });
  }

  async recordAuction(dto: RecordAuctionDto, recordedById: string) {
    const chitGroup = await this.prisma.chitGroup.findUnique({
      where: { id: dto.chitGroupId },
      include: { memberships: true },
    });

    if (!chitGroup) {
      throw new NotFoundException(`Chit Group ${dto.chitGroupId} not found`);
    }

    if (chitGroup.chitType !== 'AUCTION_BASED') {
      throw new BadRequestException('Auctions can only be recorded for Auction-based chit groups');
    }

    // Check if auction already exists for this month
    const existing = await this.prisma.auction.findUnique({
      where: {
        chitGroupId_monthNumber: {
          chitGroupId: dto.chitGroupId,
          monthNumber: dto.monthNumber,
        },
      },
    });
    if (existing) {
      throw new BadRequestException(`Auction for Month ${dto.monthNumber} is already recorded`);
    }

    // Validate winning member belongs to this group
    const winningMember = chitGroup.memberships.find((m) => m.id === dto.winningMembershipId);
    if (!winningMember) {
      throw new BadRequestException('Selected winning member does not belong to this chit group');
    }

    if (winningMember.isPrized) {
      throw new BadRequestException('This member has already won a previous auction in this group');
    }

    // Financial calculations
    const totalValue = Number(chitGroup.totalValue);
    const winningBid = Number(dto.winningBidAmount);

    // Validate bid discount limits
    if (chitGroup.minBidDiscount && winningBid < Number(chitGroup.minBidDiscount)) {
      throw new BadRequestException(`Bid discount (₹${winningBid}) is below group minimum (₹${chitGroup.minBidDiscount})`);
    }
    if (chitGroup.maxBidDiscount && winningBid > Number(chitGroup.maxBidDiscount)) {
      throw new BadRequestException(`Bid discount (₹${winningBid}) exceeds group ceiling (₹${chitGroup.maxBidDiscount})`);
    }

    let foremanCommission = 0;
    // Commission is only charged if explicitly confirmed by owner and configured
    if (
      chitGroup.isCommissionConfirmed &&
      chitGroup.commissionType !== CommissionType.NO_COMMISSION &&
      chitGroup.commissionType !== CommissionType.NOT_CONFIGURED
    ) {
      if (chitGroup.commissionType === CommissionType.PERCENTAGE_OF_CHIT_VALUE) {
        const rate = Number(chitGroup.commissionRate ?? chitGroup.foremanCommissionRate ?? 0);
        foremanCommission = (totalValue * rate) / 100;
      } else if (chitGroup.commissionType === CommissionType.PERCENTAGE_OF_EACH_COLLECTION) {
        const rate = Number(chitGroup.commissionRate ?? 0);
        const monthlyPool = Number(chitGroup.monthlyContribution) * chitGroup.totalMonths;
        foremanCommission = Math.round(((monthlyPool * rate) / 100 / chitGroup.totalMonths) * 100) / 100;
      } else if (chitGroup.commissionType === CommissionType.FIXED_AMOUNT_PER_INSTALLMENT) {
        foremanCommission = Number(chitGroup.commissionAmount ?? 0);
      } else if (chitGroup.commissionType === CommissionType.FIXED_AMOUNT_PER_CHIT_GROUP) {
        foremanCommission = Math.round((Number(chitGroup.commissionAmount ?? 0) / chitGroup.totalMonths) * 100) / 100;
      } else if (chitGroup.commissionType === CommissionType.AUCTION_BASED_EARNINGS) {
        const rate = Number(chitGroup.commissionRate ?? chitGroup.foremanCommissionRate ?? 5.0);
        foremanCommission = (totalValue * rate) / 100;
      } else if (chitGroup.commissionType === CommissionType.CUSTOM_OTHER) {
        foremanCommission = Number(chitGroup.commissionAmount ?? 0);
      }
    } else {
      foremanCommission = 0;
    }

    const dividendTotal = Math.max(0, winningBid - foremanCommission);
    const totalMembers = chitGroup.totalMonths;
    const dividendPerMember = Math.floor((dividendTotal / totalMembers) * 100) / 100;
    const netPrizeAmount = totalValue - winningBid;

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Auction record
      const auction = await tx.auction.create({
        data: {
          chitGroupId: dto.chitGroupId,
          monthNumber: dto.monthNumber,
          auctionDate: new Date(dto.auctionDate),
          winningBidAmount: winningBid,
          foremanCommission,
          dividendTotal,
          dividendPerMember,
          winningMembershipId: dto.winningMembershipId,
          netPrizeAmount,
          status: AuctionStatus.COMPLETED,
          notes: dto.notes?.trim() || null,
        },
      });

      // 2. Update winning membership
      await tx.membership.update({
        where: { id: dto.winningMembershipId },
        data: {
          isPrized: true,
          prizedMonth: dto.monthNumber,
          prizeAmount: netPrizeAmount,
        },
      });

      // 3. Update the corresponding installment's dividend and payable amount
      const installment = await tx.installment.findUnique({
        where: {
          chitGroupId_monthNumber: {
            chitGroupId: dto.chitGroupId,
            monthNumber: dto.monthNumber,
          },
        },
      });

      if (installment) {
        const baseAmount = Number(installment.baseAmount);
        const payableAmount = Math.max(0, baseAmount - dividendPerMember);
        await tx.installment.update({
          where: { id: installment.id },
          data: {
            auctionId: auction.id,
            dividendPerTicket: dividendPerMember,
            payableAmount,
          },
        });
      }

      // 4. Advance current month if needed
      if (dto.monthNumber >= chitGroup.currentMonth && dto.monthNumber < chitGroup.totalMonths) {
        await tx.chitGroup.update({
          where: { id: dto.chitGroupId },
          data: {
            currentMonth: dto.monthNumber + 1,
          },
        });
      }

      // 5. Audit log
      await tx.auditLog.create({
        data: {
          entityType: 'AUCTION',
          entityId: auction.id,
          action: 'AUCTION_COMPLETED',
          performedById: recordedById,
          metadata: {
            groupCode: chitGroup.groupCode,
            monthNumber: dto.monthNumber,
            winningBid,
            dividendPerMember,
            netPrizeAmount,
          },
        },
      });

      return auction;
    });
  }
}
