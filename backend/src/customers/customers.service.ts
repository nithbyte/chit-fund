import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string) {
    const where: any = {};
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { customerCode: { contains: q, mode: 'insensitive' } },
      ];
    }

    const customers = await this.prisma.customer.findMany({
      where,
      orderBy: { customerCode: 'asc' },
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
    });

    return customers.map((c) => ({
      ...c,
      activeMembershipsCount: c.memberships.filter((m) => m.chitGroup.status === 'ACTIVE').length,
    }));
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
          take: 20,
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

    // Calculate total dues and total paid for this customer across all memberships
    let totalPaid = 0;
    let totalDues = 0;

    for (const mem of customer.memberships) {
      const currentMonth = mem.chitGroup.currentMonth;
      for (const inst of mem.chitGroup.installments) {
        if (inst.monthNumber <= currentMonth) {
          const payable = Number(inst.payableAmount);
          // Allocations specifically for this member and this installment
          const paidForInst = inst.paymentAllocations
            .filter((a) => a.membershipId === mem.id)
            .reduce((sum, a) => sum + Number(a.allocatedAmount), 0);

          totalPaid += paidForInst;
          if (paidForInst < payable) {
            totalDues += payable - paidForInst;
          }
        }
      }
    }

    return {
      ...customer,
      summary: {
        totalPaid,
        totalDues,
      },
    };
  }

  async create(createDto: CreateCustomerDto) {
    // Generate next customer code CUST-XXX
    const count = await this.prisma.customer.count();
    let nextNum = count + 1;
    let customerCode = `CUST-${String(nextNum).padStart(3, '0')}`;

    // Verify uniqueness
    const existing = await this.prisma.customer.findUnique({
      where: { customerCode },
    });
    if (existing) {
      customerCode = `CUST-${String(nextNum + 10).padStart(3, '0')}`;
    }

    // Check duplicate phone
    const duplicatePhone = await this.prisma.customer.findFirst({
      where: { phone: createDto.phone.trim() },
    });
    if (duplicatePhone) {
      throw new BadRequestException(`A customer with phone ${createDto.phone} already exists (${duplicatePhone.fullName})`);
    }

    return this.prisma.customer.create({
      data: {
        customerCode,
        fullName: createDto.fullName.trim(),
        phone: createDto.phone.trim(),
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

    if (updateDto.phone && updateDto.phone !== customer.phone) {
      const duplicate = await this.prisma.customer.findFirst({
        where: { phone: updateDto.phone.trim(), id: { not: id } },
      });
      if (duplicate) {
        throw new BadRequestException(`Another customer already has phone number ${updateDto.phone}`);
      }
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
