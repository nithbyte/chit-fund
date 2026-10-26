import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RecordCollectionDto } from './dto/record-collection.dto.js';
import { ReverseCollectionDto } from './dto/reverse-collection.dto.js';

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: { customerId?: string; startDate?: string; endDate?: string; isReversed?: boolean }) {
    const where: any = {};
    if (query?.customerId) {
      where.customerId = query.customerId;
    }
    if (query?.isReversed !== undefined) {
      where.isReversed = query.isReversed;
    }
    if (query?.startDate || query?.endDate) {
      where.paymentDate = {};
      if (query.startDate) where.paymentDate.gte = new Date(query.startDate);
      if (query.endDate) where.paymentDate.lte = new Date(query.endDate);
    }

    return this.prisma.payment.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            customerCode: true,
            fullName: true,
            phone: true,
          },
        },
        receivedBy: {
          select: {
            id: true,
            fullName: true,
            username: true,
          },
        },
        allocations: {
          include: {
            installment: {
              include: {
                chitGroup: {
                  select: {
                    id: true,
                    groupCode: true,
                    name: true,
                  },
                },
              },
            },
            membership: {
              select: {
                id: true,
                ticketNumber: true,
              },
            },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        customer: true,
        receivedBy: {
          select: { id: true, fullName: true, username: true },
        },
        allocations: {
          include: {
            installment: {
              include: {
                chitGroup: true,
              },
            },
            membership: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment receipt ${id} not found`);
    }

    return payment;
  }

  async getCustomerPendingDues(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            chitGroup: {
              include: {
                installments: {
                  orderBy: { monthNumber: 'asc' },
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
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    const pendingInstallments: any[] = [];

    for (const mem of customer.memberships) {
      const activeGroup = mem.chitGroup;
      for (const inst of activeGroup.installments) {
        if (inst.monthNumber <= activeGroup.currentMonth) {
          const payable = Number(inst.payableAmount);
          const paidAlready = inst.paymentAllocations
            .filter((a) => a.membershipId === mem.id)
            .reduce((sum, a) => sum + Number(a.allocatedAmount), 0);

          const due = payable - paidAlready;
          if (due > 0) {
            pendingInstallments.push({
              membershipId: mem.id,
              ticketNumber: mem.ticketNumber,
              groupId: activeGroup.id,
              groupCode: activeGroup.groupCode,
              groupName: activeGroup.name,
              installmentId: inst.id,
              monthNumber: inst.monthNumber,
              dueDate: inst.dueDate,
              payableAmount: payable,
              paidAlready,
              dueAmount: due,
            });
          }
        }
      }
    }

    return {
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        phone: customer.phone,
        customerCode: customer.customerCode,
      },
      pendingInstallments,
      totalDueAmount: pendingInstallments.reduce((sum, i) => sum + i.dueAmount, 0),
    };
  }

  async recordCollection(dto: RecordCollectionDto, receivedById: string) {
    // 1. Validate that allocations total equals the payment amount
    const totalAllocated = dto.allocations.reduce((sum, a) => sum + Number(a.allocatedAmount), 0);
    if (Math.abs(totalAllocated - Number(dto.amount)) > 0.01) {
      throw new BadRequestException(
        `Total allocated amounts (₹${totalAllocated}) must match the payment amount (₹${dto.amount})`,
      );
    }

    // 2. Validate customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer ${dto.customerId} not found`);
    }

    // 3. Generate unique receipt number
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const countThisMonth = await this.prisma.payment.count({
      where: {
        receiptNumber: {
          startsWith: `REC-${yyyymm}`,
        },
      },
    });
    const receiptNumber = `REC-${yyyymm}-${String(countThisMonth + 1).padStart(4, '0')}`;

    const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      // Create Payment record
      const payment = await tx.payment.create({
        data: {
          receiptNumber,
          customerId: dto.customerId,
          amount: dto.amount,
          paymentDate,
          paymentMode: dto.paymentMode,
          transactionRef: dto.transactionRef?.trim() || null,
          notes: dto.notes?.trim() || null,
          receivedById,
          status: PaymentStatus.COMPLETED,
          isReversed: false,
        },
      });

      // Create allocations
      for (const alloc of dto.allocations) {
        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            membershipId: alloc.membershipId,
            installmentId: alloc.installmentId,
            allocatedAmount: alloc.allocatedAmount,
            notes: alloc.notes?.trim() || null,
          },
        });
      }

      // Log to audit log
      await tx.auditLog.create({
        data: {
          entityType: 'PAYMENT',
          entityId: payment.id,
          action: 'COLLECTION_RECORDED',
          performedById: receivedById,
          metadata: {
            receiptNumber: payment.receiptNumber,
            amount: dto.amount,
            mode: dto.paymentMode,
            customerId: dto.customerId,
            allocationsCount: dto.allocations.length,
          },
        },
      });

      return payment;
    });
  }

  async reversePayment(id: string, dto: ReverseCollectionDto, reversedById: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }

    if (payment.isReversed) {
      throw new BadRequestException(`Payment ${payment.receiptNumber} has already been reversed`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id },
        data: {
          isReversed: true,
          status: PaymentStatus.REVERSED,
          reversalReason: dto.reason.trim(),
          reversedAt: new Date(),
          reversedById,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'PAYMENT',
          entityId: payment.id,
          action: 'PAYMENT_REVERSED',
          performedById: reversedById,
          metadata: {
            receiptNumber: payment.receiptNumber,
            originalAmount: payment.amount,
            reason: dto.reason.trim(),
          },
        },
      });

      return updated;
    });
  }
}
