import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuctionCalculationMode, AuctionStatus, ChitGroupStatus, CommissionType, MembershipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RecordAuctionDto } from './dto/record-auction.dto.js';
import { PreviewAuctionDto } from './dto/preview-auction.dto.js';

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
            monthlyContribution: true,
            totalMonths: true,
            currentMonth: true,
            auctionCalculationMode: true,
            fixedPayoutAmount: true,
            fixedPayoutAdjustments: true,
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

  /**
   * Helper that computes auction financial metrics with PostgreSQL Decimal precision.
   * Adheres strictly to financial safeguards:
   * 1. Never assume commission using an unconfirmed percentage.
   * 2. Never generate dividends when discount is zero.
   * 3. Do not assume fixed payout equals chit value.
   * 4. Enforce discount ceilings and bounds.
   */
  computeAuctionCalculations(
    chitGroup: any,
    dto: {
      auctionCalculationMode?: AuctionCalculationMode;
      winningBidAmount?: number;
      fixedPayoutAmount?: number;
      adjustmentAmount?: number;
      monthNumber: number;
    },
  ) {
    const totalValue = Number(chitGroup.totalValue);
    const totalMembers = chitGroup.totalMonths;

    const mode =
      dto.auctionCalculationMode ??
      chitGroup.auctionCalculationMode ??
      AuctionCalculationMode.DISCOUNT_BASED;

    let winningBid = 0;
    let foremanCommission = 0;
    let dividendTotal = 0;
    let dividendPerMember = 0;
    let fixedPayoutAmount: number | null = null;
    let adjustmentAmount = 0;
    let netPrizeAmount = 0;
    let commissionRuleSummary = 'No commission configured';
    let discountDistributionSummary = '';

    if (mode === AuctionCalculationMode.DISCOUNT_BASED) {
      winningBid = Number(dto.winningBidAmount ?? 0);

      if (Number.isNaN(winningBid) || winningBid < 0) {
        throw new BadRequestException('Winning bid discount cannot be negative');
      }

      if (winningBid > totalValue) {
        throw new BadRequestException(
          `Winning bid discount (₹${winningBid.toLocaleString('en-IN')}) cannot exceed total chit value (₹${totalValue.toLocaleString('en-IN')})`,
        );
      }

      if (chitGroup.minBidDiscount && winningBid > 0 && winningBid < Number(chitGroup.minBidDiscount)) {
        throw new BadRequestException(
          `Bid discount (₹${winningBid.toLocaleString('en-IN')}) is below group minimum (₹${Number(chitGroup.minBidDiscount).toLocaleString('en-IN')})`,
        );
      }

      if (chitGroup.maxBidDiscount && winningBid > Number(chitGroup.maxBidDiscount)) {
        throw new BadRequestException(
          `Bid discount (₹${winningBid.toLocaleString('en-IN')}) exceeds group ceiling (₹${Number(chitGroup.maxBidDiscount).toLocaleString('en-IN')})`,
        );
      }

      // Commission is ONLY charged if explicitly confirmed by owner and configured
      if (
        chitGroup.isCommissionConfirmed &&
        chitGroup.commissionType !== CommissionType.NO_COMMISSION &&
        chitGroup.commissionType !== CommissionType.NOT_CONFIGURED
      ) {
        if (chitGroup.commissionType === CommissionType.PERCENTAGE_OF_CHIT_VALUE) {
          const rate = Number(chitGroup.commissionRate ?? chitGroup.foremanCommissionRate ?? 0);
          foremanCommission = Math.round(((totalValue * rate) / 100) * 100) / 100;
          commissionRuleSummary = `${rate}% of chit value (₹${foremanCommission.toLocaleString('en-IN')})`;
        } else if (chitGroup.commissionType === CommissionType.PERCENTAGE_OF_EACH_COLLECTION) {
          const rate = Number(chitGroup.commissionRate ?? 0);
          const monthlyPool = Number(chitGroup.monthlyContribution) * chitGroup.totalMonths;
          foremanCommission = Math.round(((monthlyPool * rate) / 100 / chitGroup.totalMonths) * 100) / 100;
          commissionRuleSummary = `${rate}% of monthly collection pool (₹${foremanCommission.toLocaleString('en-IN')})`;
        } else if (chitGroup.commissionType === CommissionType.FIXED_AMOUNT_PER_INSTALLMENT) {
          foremanCommission = Number(chitGroup.commissionAmount ?? 0);
          commissionRuleSummary = `Fixed ₹${foremanCommission.toLocaleString('en-IN')} per installment`;
        } else if (chitGroup.commissionType === CommissionType.FIXED_AMOUNT_PER_CHIT_GROUP) {
          foremanCommission = Math.round((Number(chitGroup.commissionAmount ?? 0) / chitGroup.totalMonths) * 100) / 100;
          commissionRuleSummary = `Fixed pool share (₹${foremanCommission.toLocaleString('en-IN')} / month)`;
        } else if (chitGroup.commissionType === CommissionType.AUCTION_BASED_EARNINGS) {
          const rate = Number(chitGroup.commissionRate ?? chitGroup.foremanCommissionRate ?? 5.0);
          foremanCommission = Math.round(((totalValue * rate) / 100) * 100) / 100;
          commissionRuleSummary = `${rate}% auction earnings (₹${foremanCommission.toLocaleString('en-IN')})`;
        } else if (chitGroup.commissionType === CommissionType.CUSTOM_OTHER) {
          foremanCommission = Number(chitGroup.commissionAmount ?? 0);
          commissionRuleSummary = `Custom: ${chitGroup.commissionNotes || 'Special'} (₹${foremanCommission.toLocaleString('en-IN')})`;
        }
      } else {
        foremanCommission = 0;
        commissionRuleSummary = 'No commission deducted (unconfirmed / zero commission)';
      }

      // Safeguard: Never generate dividends when no discount exists
      if (winningBid === 0) {
        dividendTotal = 0;
        dividendPerMember = 0;
        discountDistributionSummary = 'Zero discount auction: no member dividends generated';
      } else {
        // Do not automatically treat entire discount as organizer profit
        dividendTotal = Math.max(0, Math.round((winningBid - foremanCommission) * 100) / 100);
        dividendPerMember = Math.floor((dividendTotal / totalMembers) * 100) / 100;
        discountDistributionSummary = `₹${dividendTotal.toLocaleString('en-IN')} divided among ${totalMembers} members (₹${dividendPerMember.toLocaleString('en-IN')} / member)`;
      }

      netPrizeAmount = Math.round((totalValue - winningBid) * 100) / 100;
    } else {
      // FIXED_PAYOUT mode
      winningBid = 0;
      dividendTotal = 0;
      dividendPerMember = 0;

      const rawPayout =
        dto.fixedPayoutAmount !== undefined && dto.fixedPayoutAmount !== null
          ? Number(dto.fixedPayoutAmount)
          : (chitGroup.fixedPayoutAmount !== null && chitGroup.fixedPayoutAmount !== undefined
              ? Number(chitGroup.fixedPayoutAmount)
              : undefined);

      if (rawPayout === undefined || Number.isNaN(rawPayout)) {
        throw new BadRequestException(
          'Fixed agreed winner payout must be specified in the request or pre-configured on the chit group scheme terms',
        );
      }

      if (rawPayout <= 0) {
        throw new BadRequestException('Fixed agreed winner payout must be greater than zero');
      }

      if (rawPayout > totalValue) {
        throw new BadRequestException(
          `Fixed winner payout (₹${rawPayout.toLocaleString('en-IN')}) cannot exceed total chit value (₹${totalValue.toLocaleString('en-IN')})`,
        );
      }

      fixedPayoutAmount = Math.round(rawPayout * 100) / 100;

      const rawAdjustment =
        dto.adjustmentAmount !== undefined && dto.adjustmentAmount !== null
          ? Number(dto.adjustmentAmount)
          : (chitGroup.fixedPayoutAdjustments !== null && chitGroup.fixedPayoutAdjustments !== undefined
              ? Number(chitGroup.fixedPayoutAdjustments)
              : 0);

      if (Number.isNaN(rawAdjustment) || rawAdjustment < 0) {
        throw new BadRequestException('Adjustments cannot be negative');
      }

      if (rawAdjustment > fixedPayoutAmount) {
        throw new BadRequestException('Adjustment amount cannot exceed fixed payout amount');
      }

      adjustmentAmount = Math.round(rawAdjustment * 100) / 100;
      netPrizeAmount = Math.round((fixedPayoutAmount - adjustmentAmount) * 100) / 100;

      // In fixed payout mode, never assume percentage commission
      if (adjustmentAmount > 0) {
        foremanCommission = adjustmentAmount;
        commissionRuleSummary = `Explicit agreed adjustment / deduction (₹${adjustmentAmount.toLocaleString('en-IN')})`;
      } else if (
        chitGroup.isCommissionConfirmed &&
        chitGroup.commissionType === CommissionType.FIXED_AMOUNT_PER_INSTALLMENT
      ) {
        foremanCommission = Number(chitGroup.commissionAmount ?? 0);
        commissionRuleSummary = `Agreed fixed fee ₹${foremanCommission.toLocaleString('en-IN')} per installment`;
      } else {
        foremanCommission = 0;
        commissionRuleSummary = 'Fixed payout: no commission assumed or deducted';
      }

      discountDistributionSummary = 'Fixed payout mode: zero discount, zero dividend distributed';
    }

    return {
      mode,
      totalValue,
      totalMembers,
      winningBid,
      foremanCommission,
      dividendTotal,
      dividendPerMember,
      fixedPayoutAmount,
      adjustmentAmount,
      netPrizeAmount,
      commissionRuleSummary,
      discountDistributionSummary,
    };
  }

  /**
   * Preview calculation of monthly auction results without persisting changes.
   * Allows the frontend and caller to inspect all computed ledger items,
   * dividends, commission, and net payouts prior to submission.
   */
  async previewAuction(dto: PreviewAuctionDto) {
    const chitGroup = await this.prisma.chitGroup.findUnique({
      where: { id: dto.chitGroupId },
      include: {
        memberships: {
          include: { customer: true },
        },
        installments: {
          where: { monthNumber: dto.monthNumber },
        },
      },
    });

    if (!chitGroup) {
      throw new NotFoundException(`Chit Group ${dto.chitGroupId} not found`);
    }

    if (dto.monthNumber < 1 || dto.monthNumber > chitGroup.totalMonths) {
      throw new BadRequestException(
        `Auction month ${dto.monthNumber} is outside group duration (1 to ${chitGroup.totalMonths})`,
      );
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

    const isDuplicate = !!existing;

    // Validate winner if provided
    let winningMember: any = null;
    let winnerError: string | null = null;
    if (dto.winningMembershipId) {
      winningMember = chitGroup.memberships.find((m) => m.id === dto.winningMembershipId);
      if (!winningMember) {
        winnerError = 'Selected winning member does not belong to this chit group';
      } else if (winningMember.status !== MembershipStatus.ACTIVE) {
        winnerError = `Selected winning member is not active (current status: ${winningMember.status})`;
      } else if (winningMember.isPrized) {
        winnerError = 'This member has already won a previous auction in this group';
      }
    }

    const calculations = this.computeAuctionCalculations(chitGroup, dto);

    const baseAmount = chitGroup.installments.length > 0
      ? Number(chitGroup.installments[0].baseAmount)
      : Number(chitGroup.monthlyContribution);

    const nextInstallmentPayable = Math.max(0, Math.round((baseAmount - calculations.dividendPerMember) * 100) / 100);

    return {
      chitGroupId: chitGroup.id,
      groupCode: chitGroup.groupCode,
      groupName: chitGroup.name,
      monthNumber: dto.monthNumber,
      auctionCalculationMode: calculations.mode,
      totalValue: calculations.totalValue,
      totalMembers: calculations.totalMembers,
      winningBidAmount: calculations.winningBid,
      foremanCommission: calculations.foremanCommission,
      dividendTotal: calculations.dividendTotal,
      dividendPerMember: calculations.dividendPerMember,
      fixedPayoutAmount: calculations.fixedPayoutAmount,
      adjustmentAmount: calculations.adjustmentAmount,
      netPrizeAmount: calculations.netPrizeAmount,
      baseInstallmentAmount: baseAmount,
      nextInstallmentPayable,
      commissionRuleSummary: calculations.commissionRuleSummary,
      discountDistributionSummary: calculations.discountDistributionSummary,
      isDuplicate,
      winnerError,
      winningMember: winningMember
        ? {
            id: winningMember.id,
            ticketNumber: winningMember.ticketNumber,
            customerName: winningMember.customer.fullName,
            phone: winningMember.customer.phone,
            isPrized: winningMember.isPrized,
          }
        : null,
    };
  }

  /**
   * Records auction result, applies member dividends and installment updates atomically.
   * Strictly verifies winner eligibility, period validity, and prevents duplicate records.
   * Does NOT disburse payout vouchers automatically.
   */
  async recordAuction(dto: RecordAuctionDto, recordedById: string) {
    const chitGroup = await this.prisma.chitGroup.findUnique({
      where: { id: dto.chitGroupId },
      include: {
        memberships: {
          include: { customer: true },
        },
      },
    });

    if (!chitGroup) {
      throw new NotFoundException(`Chit Group ${dto.chitGroupId} not found`);
    }

    if (chitGroup.status !== ChitGroupStatus.ACTIVE) {
      throw new BadRequestException(
        `Auctions can only be recorded for ACTIVE chit groups (current status: ${chitGroup.status})`,
      );
    }

    // Validate auction period
    if (dto.monthNumber < 1 || dto.monthNumber > chitGroup.totalMonths) {
      throw new BadRequestException(
        `Auction month ${dto.monthNumber} is outside group duration (1 to ${chitGroup.totalMonths})`,
      );
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

    if (winningMember.status !== MembershipStatus.ACTIVE) {
      throw new BadRequestException(
        `Selected winning member is not active (current status: ${winningMember.status})`,
      );
    }

    if (winningMember.isPrized) {
      throw new BadRequestException('This member has already won a previous auction in this group');
    }

    // Compute financial figures based on configured mode
    const calc = this.computeAuctionCalculations(chitGroup, dto);

    // Validate auction date
    const auctionDate = new Date(dto.auctionDate);
    if (Number.isNaN(auctionDate.getTime())) {
      throw new BadRequestException('Invalid auction date provided');
    }

    // Execute atomic database transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. Create Auction record with calculation mode and metrics
      const auction = await tx.auction.create({
        data: {
          chitGroupId: dto.chitGroupId,
          monthNumber: dto.monthNumber,
          auctionDate,
          auctionCalculationMode: calc.mode,
          winningBidAmount: calc.winningBid,
          foremanCommission: calc.foremanCommission,
          dividendTotal: calc.dividendTotal,
          dividendPerMember: calc.dividendPerMember,
          winningMembershipId: dto.winningMembershipId,
          fixedPayoutAmount: calc.fixedPayoutAmount,
          adjustmentAmount: calc.adjustmentAmount,
          netPrizeAmount: calc.netPrizeAmount,
          status: AuctionStatus.COMPLETED,
          notes: dto.notes?.trim() || null,
        },
      });

      // 2. Update winning membership to prized
      await tx.membership.update({
        where: { id: dto.winningMembershipId },
        data: {
          isPrized: true,
          prizedMonth: dto.monthNumber,
          prizeAmount: calc.netPrizeAmount,
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
        const payableAmount = Math.max(0, Math.round((baseAmount - calc.dividendPerMember) * 100) / 100);
        await tx.installment.update({
          where: { id: installment.id },
          data: {
            auctionId: auction.id,
            dividendPerTicket: calc.dividendPerMember,
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
            auctionCalculationMode: calc.mode,
            winningBid: calc.winningBid,
            fixedPayoutAmount: calc.fixedPayoutAmount,
            adjustmentAmount: calc.adjustmentAmount,
            foremanCommission: calc.foremanCommission,
            dividendTotal: calc.dividendTotal,
            dividendPerMember: calc.dividendPerMember,
            netPrizeAmount: calc.netPrizeAmount,
            winningTicketNumber: winningMember.ticketNumber,
          },
        },
      });

      return auction;
    });
  }
}
