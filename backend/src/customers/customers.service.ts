import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';

export interface CustomerQueryDto {
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async checkDuplicate(phone: string, fullName?: string) {
    const trimmedPhone = phone ? phone.trim() : '';
    const trimmedName = fullName ? fullName.trim() : '';

    const matchingPhone = trimmedPhone
      ? await this.prisma.customer.findMany({
          where: {
            OR: [
              { phone: trimmedPhone },
              { alternatePhone: trimmedPhone },
            ],
          },
          select: {
            id: true,
            customerCode: true,
            fullName: true,
            phone: true,
            address: true,
            isActive: true,
          },
        })
      : [];

    let matchingName: any[] = [];
    if (trimmedName && trimmedName.length >= 3) {
      matchingName = await this.prisma.customer.findMany({
        where: {
          fullName: { contains: trimmedName, mode: 'insensitive' },
          id: { notIn: matchingPhone.map((c) => c.id) },
        },
        select: {
          id: true,
          customerCode: true,
          fullName: true,
          phone: true,
          address: true,
          isActive: true,
        },
        take: 3,
      });
    }

    return {
      hasMatches: matchingPhone.length > 0 || matchingName.length > 0,
      matchingPhone,
      matchingName,
    };
  }

  async findAll(query?: CustomerQueryDto) {
    const where: any = {};
    if (query?.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { customerCode: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (query?.status) {
      where.isActive = query.status.toLowerCase() === 'active';
    }

    const page = query?.page ? Math.max(1, Number(query.page)) : 1;
    const limit = query?.limit ? Math.max(1, Number(query.limit)) : 50;
    const skip = (page - 1) * limit;

    const [total, customers] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        orderBy: { customerCode: 'asc' },
        skip,
        take: limit,
        include: {
          memberships: {
            include: {
              chitGroup: {
                select: {
                  id: true,
                  groupCode: true,
                  name: true,
                  status: true,
                  totalValue: true,
                  monthlyContribution: true,
                },
              },
            },
          },
          _count: {
            select: {
              payments: { where: { isReversed: false } },
              memberships: true,
            },
          },
        },
      }),
    ]);

    const formatted = customers.map((c) => ({
      ...c,
      activeMembershipsCount: c.memberships.filter((m) => m.chitGroup.status === 'ACTIVE').length,
    }));

    return {
      items: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
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
                        payment: { isReversed: false },
                      },
                    },
                  },
                },
              },
            },
            paymentAllocations: {
              where: {
                payment: { isReversed: false },
              },
              include: {
                payment: true,
                installment: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 30,
          include: {
            allocations: {
              include: {
                installment: true,
                membership: {
                  include: { chitGroup: true },
                },
              },
            },
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    // Calculate customer outstanding dues & paid totals from valid ledger entries
    let totalPaid = 0;
    let totalDues = 0;
    const membershipSummaries: any[] = [];

    for (const mem of customer.memberships) {
      let groupPaid = 0;
      let groupDue = 0;
      const currentMonth = mem.chitGroup.currentMonth;

      for (const inst of mem.chitGroup.installments) {
        if (inst.monthNumber <= currentMonth) {
          const payable = Number(inst.payableAmount);
          const paidForInst = inst.paymentAllocations
            .filter((a) => a.membershipId === mem.id)
            .reduce((sum, a) => sum + Number(a.allocatedAmount), 0);

          groupPaid += paidForInst;
          if (paidForInst < payable) {
            groupDue += payable - paidForInst;
          }
        }
      }

      totalPaid += groupPaid;
      totalDues += groupDue;

      membershipSummaries.push({
        membershipId: mem.id,
        ticketNumber: mem.ticketNumber,
        groupId: mem.chitGroup.id,
        groupCode: mem.chitGroup.groupCode,
        groupName: mem.chitGroup.name,
        chitType: mem.chitGroup.chitType,
        status: mem.status,
        isPrized: mem.isPrized,
        prizedMonth: mem.prizedMonth,
        prizeAmount: mem.prizeAmount ? Number(mem.prizeAmount) : null,
        monthlyContribution: Number(mem.chitGroup.monthlyContribution),
        groupPaid,
        groupDue,
      });
    }

    return {
      ...customer,
      membershipSummaries,
      summary: {
        totalPaid,
        totalDues,
      },
    };
  }

  async create(createDto: CreateCustomerDto) {
    const trimmedPhone = createDto.phone.trim();
    const trimmedName = createDto.fullName.trim();

    // Check matching phone or similar name warning
    if (!createDto.confirmDuplicate) {
      const duplicateCheck = await this.checkDuplicate(trimmedPhone, trimmedName);
      if (duplicateCheck.hasMatches) {
        const phoneMatch = duplicateCheck.matchingPhone[0];
        const nameMatch = duplicateCheck.matchingName[0];
        const matchDesc = phoneMatch
          ? `Customer with same phone already exists: ${phoneMatch.fullName} (${phoneMatch.customerCode})`
          : `Customer with similar name exists: ${nameMatch.fullName} (${nameMatch.customerCode})`;

        throw new BadRequestException({
          statusCode: 400,
          error: 'DUPLICATE_WARNING',
          message: `${matchDesc}. Set confirmDuplicate=true to proceed if this is an intentional new member.`,
          matchingCustomers: [...duplicateCheck.matchingPhone, ...duplicateCheck.matchingName],
        });
      }
    }

    // Generate next customer code CUST-XXX
    const count = await this.prisma.customer.count();
    let nextNum = count + 1;
    let customerCode = `CUST-${String(nextNum).padStart(3, '0')}`;

    // Verify uniqueness of code
    const existing = await this.prisma.customer.findUnique({
      where: { customerCode },
    });
    if (existing) {
      customerCode = `CUST-${String(nextNum + 10).padStart(3, '0')}`;
    }

    return this.prisma.customer.create({
      data: {
        customerCode,
        fullName: trimmedName,
        phone: trimmedPhone,
        alternatePhone: createDto.alternatePhone?.trim() || null,
        email: createDto.email?.trim() || null,
        address: createDto.address?.trim() || null,
        identityProofType: createDto.identityProofType?.trim() || null,
        identityProofNumber: createDto.identityProofNumber?.trim() || null,
        notes: createDto.notes?.trim() || null,
      },
    });
  }

  async update(id: string, updateDto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        fullName: updateDto.fullName?.trim(),
        phone: updateDto.phone?.trim(),
        alternatePhone: updateDto.alternatePhone?.trim(),
        email: updateDto.email?.trim(),
        address: updateDto.address?.trim(),
        identityProofType: updateDto.identityProofType?.trim(),
        identityProofNumber: updateDto.identityProofNumber?.trim(),
        notes: updateDto.notes?.trim(),
        isActive: updateDto.isActive,
      },
    });
  }
}
