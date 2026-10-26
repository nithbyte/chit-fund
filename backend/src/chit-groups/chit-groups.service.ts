import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChitGroupStatus, ChitType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateChitGroupDto } from './dto/create-chit-group.dto.js';
import { EnrollMemberDto } from './dto/enroll-member.dto.js';
import { ActivateChitGroupDto } from './dto/activate-chit-group.dto.js';

export interface SchemeTemplate {
  templateId: string;
  name: string;
  chitType: ChitType;
  frequency: 'WEEKLY' | 'MONTHLY';
  installmentAmount: number;
  durationPeriods: number;
  durationLabel: string;
  expectedMemberContribution: number;
  totalChitValue: number;
  defaultCommissionRate: number;
  requiresMemberConfirmation: boolean;
  requiresPayoutConfirmation: boolean;
  notes: string;
  payoutRuleSummary: string;
}

@Injectable()
export class ChitGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reusable Scheme Templates for Durga Chit Fund:
   * Scheme A: Diwali Weekly Chit (₹200/wk for 52 wks = ₹10,400)
   * Scheme B: ₹1 Lakh Chit (₹5,000/mo for 20 mos = ₹1,00,000, unconfirmed member count & payout rules)
   */
  getSchemeTemplates(): SchemeTemplate[] {
    return [
      {
        templateId: 'TEMPLATE_DIWALI_WEEKLY',
        name: 'Diwali Weekly Chit Scheme (1 Year)',
        chitType: ChitType.FIXED_INSTALLMENT,
        frequency: 'WEEKLY',
        installmentAmount: 200,
        durationPeriods: 52,
        durationLabel: '52 Weeks (1 Year)',
        expectedMemberContribution: 10400,
        totalChitValue: 10400, // Stated base value per ticket
        defaultCommissionRate: 5.0,
        requiresMemberConfirmation: true,
        requiresPayoutConfirmation: true,
        notes:
          'Diwali weekly savings scheme: ₹200 per week for 52 weeks (1 year). Total contribution per member: ₹10,400. Member capacity, start date, and festival payout terms are configurable.',
        payoutRuleSummary:
          'Fixed festival payout of ₹10,400 per active ticket upon completion of 52 weekly installments, plus optional Deepavali incentive/gift.',
      },
      {
        templateId: 'TEMPLATE_1_LAKH_MONTHLY',
        name: '₹1 Lakh Monthly Chit Scheme (20 Months)',
        chitType: ChitType.AUCTION_BASED,
        frequency: 'MONTHLY',
        installmentAmount: 5000,
        durationPeriods: 20,
        durationLabel: '20 Months',
        expectedMemberContribution: 100000,
        totalChitValue: 100000, // Stated amount paid to winning member
        defaultCommissionRate: 5.0,
        requiresMemberConfirmation: true,
        requiresPayoutConfirmation: true,
        notes:
          'Stated chit prize of ₹1,00,000 to winning member. 20 monthly installments of ₹5,000 per member. Member count, monthly collection total, auction mechanism, applicable deductions, and net payout must be explicitly configured according to the actual scheme agreement.',
        payoutRuleSummary:
          'The stated ₹1,00,000 chit value is paid to the successful bidder after deducting the winning bid discount and 5% foreman commission. Net dividend is distributed equally to non-prized members.',
      },
    ];
  }

  async findAll() {
    const groups = await this.prisma.chitGroup.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            memberships: true,
            auctions: true,
            installments: true,
          },
        },
      },
    });

    return groups.map((g) => ({
      ...g,
      enrolledMembersCount: g._count.memberships,
      totalSlots: g.totalMonths,
      vacantSlots: Math.max(0, g.totalMonths - g._count.memberships),
      isWeekly: (g.auctionFrequency || '').toUpperCase() === 'WEEKLY',
    }));
  }

  async findOne(id: string) {
    const group = await this.prisma.chitGroup.findUnique({
      where: { id },
      include: {
        memberships: {
          orderBy: { ticketNumber: 'asc' },
          include: {
            customer: true,
            paymentAllocations: {
              where: { payment: { isReversed: false } },
            },
          },
        },
        installments: {
          orderBy: { monthNumber: 'asc' },
          include: {
            auction: {
              include: {
                winningMembership: {
                  include: { customer: true },
                },
              },
            },
            paymentAllocations: {
              where: { payment: { isReversed: false } },
            },
          },
        },
        auctions: {
          orderBy: { monthNumber: 'asc' },
          include: {
            winningMembership: {
              include: { customer: true },
            },
          },
        },
        payouts: {
          orderBy: { payoutDate: 'desc' },
          include: {
            membership: {
              include: { customer: true },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Chit Group with ID ${id} not found`);
    }

    // Augment installments with total collected amount
    const installmentsWithStats = group.installments.map((inst) => {
      const totalCollected = inst.paymentAllocations.reduce(
        (sum, a) => sum + Number(a.allocatedAmount),
        0,
      );
      const expectedTotal = Number(inst.payableAmount) * group.memberships.length;
      return {
        ...inst,
        totalCollected,
        expectedTotal,
        collectionPercentage:
          expectedTotal > 0 ? Math.min(100, Math.round((totalCollected / expectedTotal) * 100)) : 0,
      };
    });

    return {
      ...group,
      isWeekly: (group.auctionFrequency || '').toUpperCase() === 'WEEKLY',
      installments: installmentsWithStats,
    };
  }

  async create(createDto: CreateChitGroupDto, performedById?: string) {
    const existing = await this.prisma.chitGroup.findUnique({
      where: { groupCode: createDto.groupCode.trim() },
    });
    if (existing) {
      throw new BadRequestException(`Group code '${createDto.groupCode}' already exists`);
    }

    const isWeekly = (createDto.auctionFrequency || '').toUpperCase() === 'WEEKLY';
    const frequency = isWeekly ? 'WEEKLY' : 'MONTHLY';
    const startDate = new Date(createDto.startDate);

    // Calculate end date accurately based on frequency
    const expectedEndDate = new Date(startDate);
    if (isWeekly) {
      expectedEndDate.setDate(expectedEndDate.getDate() + createDto.totalMonths * 7);
    } else {
      expectedEndDate.setMonth(expectedEndDate.getMonth() + createDto.totalMonths);
    }

    const groupStatus =
      (createDto.status as ChitGroupStatus) ||
      (createDto.chitType === ChitType.AUCTION_BASED && Number(createDto.totalValue) === 100000
        ? ChitGroupStatus.PLANNED
        : ChitGroupStatus.ACTIVE);

    return this.prisma.$transaction(async (tx) => {
      const chitGroup = await tx.chitGroup.create({
        data: {
          groupCode: createDto.groupCode.trim(),
          name: createDto.name.trim(),
          chitType: createDto.chitType,
          totalValue: createDto.totalValue,
          monthlyContribution: createDto.monthlyContribution,
          totalMonths: createDto.totalMonths,
          currentMonth: 1,
          startDate,
          expectedEndDate,
          foremanCommissionRate: createDto.foremanCommissionRate ?? 5.0,
          minBidDiscount: createDto.minBidDiscount ?? null,
          maxBidDiscount: createDto.maxBidDiscount ?? null,
          auctionFrequency: frequency,
          auctionDayOfMonth: isWeekly ? null : (createDto.auctionDayOfMonth ?? startDate.getDate()),
          status: groupStatus,
          notes: createDto.notes?.trim() ?? null,
        },
      });

      // Idempotently generate installments schedule
      await this.generateScheduleInternal(chitGroup.id, tx);

      // Log audit trail
      if (performedById) {
        await tx.auditLog.create({
          data: {
            entityType: 'CHIT_GROUP',
            entityId: chitGroup.id,
            action: 'CHIT_GROUP_CREATED',
            performedById,
            metadata: {
              groupCode: chitGroup.groupCode,
              name: chitGroup.name,
              chitType: chitGroup.chitType,
              frequency,
              totalValue: Number(chitGroup.totalValue),
              totalMonths: chitGroup.totalMonths,
              status: chitGroup.status,
            },
          },
        });
      }

      return chitGroup;
    });
  }

  /**
   * Confirms unconfirmed member count, start date, and payout rules, then transitions group to ACTIVE.
   * Requirement 2: Require owner to enter and confirm group start date, member capacity, and payout rules before activating.
   */
  async activateGroup(groupId: string, dto: ActivateChitGroupDto, performedById?: string) {
    if (!dto.confirmActivation) {
      throw new BadRequestException('Owner confirmation is required to activate this chit group');
    }

    const group = await this.prisma.chitGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Chit Group ${groupId} not found`);
    }

    if (group.status === ChitGroupStatus.ACTIVE) {
      throw new BadRequestException(`Chit Group ${group.groupCode} is already active`);
    }

    const startDate = new Date(dto.startDate);
    const isWeekly = (group.auctionFrequency || '').toUpperCase() === 'WEEKLY';

    const expectedEndDate = new Date(startDate);
    if (isWeekly) {
      expectedEndDate.setDate(expectedEndDate.getDate() + dto.totalMonths * 7);
    } else {
      expectedEndDate.setMonth(expectedEndDate.getMonth() + dto.totalMonths);
    }

    // Preserve historical notes while appending confirmed payout rules
    let updatedNotes = group.notes || '';
    if (dto.payoutRuleNotes?.trim()) {
      updatedNotes = updatedNotes
        ? `${updatedNotes}\n[Confirmed Payout Rules]: ${dto.payoutRuleNotes.trim()}`
        : `[Confirmed Payout Rules]: ${dto.payoutRuleNotes.trim()}`;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.chitGroup.update({
        where: { id: groupId },
        data: {
          startDate,
          expectedEndDate,
          totalMonths: dto.totalMonths,
          foremanCommissionRate: dto.foremanCommissionRate ?? group.foremanCommissionRate,
          minBidDiscount: dto.minBidDiscount ?? group.minBidDiscount,
          maxBidDiscount: dto.maxBidDiscount ?? group.maxBidDiscount,
          status: ChitGroupStatus.ACTIVE,
          notes: updatedNotes,
        },
      });

      // Synchronize/generate schedule idempotently without duplicates
      await this.generateScheduleInternal(groupId, tx);

      // Record audit log
      if (performedById) {
        await tx.auditLog.create({
          data: {
            entityType: 'CHIT_GROUP',
            entityId: groupId,
            action: 'CHIT_GROUP_ACTIVATED',
            performedById,
            metadata: {
              groupCode: updated.groupCode,
              confirmedStartDate: dto.startDate,
              confirmedCapacity: dto.totalMonths,
              payoutRules: dto.payoutRuleNotes || 'Standard scheme rules',
            },
          },
        });
      }

      return updated;
    });
  }

  /**
   * Idempotent Schedule Generation (Requirement 8):
   * Never generates duplicate installments if schedule generation is retried.
   * Preserves existing installment records and payment allocations.
   */
  async generateSchedule(groupId: string) {
    return this.prisma.$transaction(async (tx) => {
      return this.generateScheduleInternal(groupId, tx);
    });
  }

  private async generateScheduleInternal(groupId: string, tx: any) {
    const group = await tx.chitGroup.findUnique({
      where: { id: groupId },
      include: {
        installments: {
          select: { monthNumber: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Chit Group ${groupId} not found`);
    }

    const existingMonths = new Set<number>(group.installments.map((i: any) => i.monthNumber));
    const isWeekly = (group.auctionFrequency || '').toUpperCase() === 'WEEKLY';
    const startDate = new Date(group.startDate);

    const installmentsToCreate: any[] = [];

    for (let period = 1; period <= group.totalMonths; period++) {
      if (existingMonths.has(period)) {
        // Skip already generated period - preserves existing data & allocations
        continue;
      }

      const dueDate = new Date(startDate);
      if (isWeekly) {
        dueDate.setDate(dueDate.getDate() + (period - 1) * 7);
      } else {
        dueDate.setMonth(dueDate.getMonth() + (period - 1));
      }

      installmentsToCreate.push({
        chitGroupId: group.id,
        monthNumber: period,
        dueDate,
        baseAmount: group.monthlyContribution,
        dividendPerTicket: 0,
        payableAmount: group.monthlyContribution,
        notes: isWeekly
          ? period === 1
            ? 'Week 1 Installment'
            : `Week ${period} Installment`
          : period === 1
          ? 'Month 1 Foreman Installment'
          : `Month ${period} Installment`,
      });
    }

    if (installmentsToCreate.length > 0) {
      await tx.installment.createMany({
        data: installmentsToCreate,
      });
    }

    return {
      groupId: group.id,
      totalSlots: group.totalMonths,
      existingCount: existingMonths.size,
      newlyCreatedCount: installmentsToCreate.length,
      frequency: group.auctionFrequency,
    };
  }

  async enrollMember(groupId: string, enrollDto: EnrollMemberDto) {
    const group = await this.prisma.chitGroup.findUnique({
      where: { id: groupId },
      include: { memberships: true },
    });

    if (!group) {
      throw new NotFoundException(`Chit Group with ID ${groupId} not found`);
    }

    if (enrollDto.ticketNumber < 1 || enrollDto.ticketNumber > group.totalMonths) {
      throw new BadRequestException(
        `Ticket number must be between 1 and ${group.totalMonths} (Member Capacity)`,
      );
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: enrollDto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${enrollDto.customerId} not found`);
    }

    const ticketTaken = group.memberships.find((m) => m.ticketNumber === enrollDto.ticketNumber);
    if (ticketTaken) {
      throw new BadRequestException(`Ticket number ${enrollDto.ticketNumber} is already allocated`);
    }

    return this.prisma.membership.create({
      data: {
        chitGroupId: groupId,
        customerId: enrollDto.customerId,
        ticketNumber: enrollDto.ticketNumber,
        nomineeName: enrollDto.nomineeName?.trim() || null,
        nomineePhone: enrollDto.nomineePhone?.trim() || null,
        notes: enrollDto.notes?.trim() || null,
      },
      include: {
        customer: true,
        chitGroup: true,
      },
    });
  }
}
