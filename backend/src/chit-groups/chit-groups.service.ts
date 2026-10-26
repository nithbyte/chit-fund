import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateChitGroupDto } from './dto/create-chit-group.dto.js';
import { EnrollMemberDto } from './dto/enroll-member.dto.js';

@Injectable()
export class ChitGroupsService {
  constructor(private readonly prisma: PrismaService) {}

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
      const totalCollected = inst.paymentAllocations.reduce((sum, a) => sum + Number(a.allocatedAmount), 0);
      const expectedTotal = Number(inst.payableAmount) * group.memberships.length;
      return {
        ...inst,
        totalCollected,
        expectedTotal,
        collectionPercentage: expectedTotal > 0 ? Math.min(100, Math.round((totalCollected / expectedTotal) * 100)) : 0,
      };
    });

    return {
      ...group,
      installments: installmentsWithStats,
    };
  }

  async create(createDto: CreateChitGroupDto) {
    const existing = await this.prisma.chitGroup.findUnique({
      where: { groupCode: createDto.groupCode.trim() },
    });
    if (existing) {
      throw new BadRequestException(`Group code '${createDto.groupCode}' already exists`);
    }

    const startDate = new Date(createDto.startDate);
    const expectedEndDate = new Date(startDate);
    expectedEndDate.setMonth(expectedEndDate.getMonth() + createDto.totalMonths);

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
          auctionDayOfMonth: createDto.auctionDayOfMonth ?? startDate.getDate(),
          notes: createDto.notes?.trim() ?? null,
        },
      });

      // Automatically generate installment schedule for all months
      const installmentsData = [];
      for (let m = 1; m <= createDto.totalMonths; m++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + (m - 1));
        installmentsData.push({
          chitGroupId: chitGroup.id,
          monthNumber: m,
          dueDate,
          baseAmount: createDto.monthlyContribution,
          dividendPerTicket: 0,
          payableAmount: createDto.monthlyContribution,
          notes: m === 1 ? 'Month 1 Foreman Installment' : `Month ${m} Installment`,
        });
      }

      await tx.installment.createMany({
        data: installmentsData,
      });

      return chitGroup;
    });
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
      throw new BadRequestException(`Ticket number must be between 1 and ${group.totalMonths}`);
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
