import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMode, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RecordCollectionDto } from './dto/record-collection.dto.js';
import { ReverseCollectionDto } from './dto/reverse-collection.dto.js';

export interface CollectionFilterDto {
  customerId?: string;
  startDate?: string;
  endDate?: string;
  isReversed?: boolean;
  paymentMode?: PaymentMode;
  receiptNumber?: string;
  search?: string;
}

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: CollectionFilterDto) {
    const where: any = {};

    if (query?.customerId) {
      where.customerId = query.customerId;
    }
    if (query?.isReversed !== undefined) {
      where.isReversed = query.isReversed;
    }
    if (query?.paymentMode) {
      where.paymentMode = query.paymentMode;
    }
    if (query?.receiptNumber) {
      where.receiptNumber = { contains: query.receiptNumber.trim(), mode: 'insensitive' };
    }
    if (query?.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { receiptNumber: { contains: q, mode: 'insensitive' } },
        { transactionRef: { contains: q, mode: 'insensitive' } },
        { customer: { fullName: { contains: q, mode: 'insensitive' } } },
        { customer: { phone: { contains: q } } },
        { customer: { customerCode: { contains: q, mode: 'insensitive' } } },
      ];
    }
    if (query?.startDate || query?.endDate) {
      where.paymentDate = {};
      if (query.startDate) where.paymentDate.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        // If date has no time component, include entire day up to 23:59:59
        if (query.endDate.length <= 10) {
          end.setHours(23, 59, 59, 999);
        }
        where.paymentDate.lte = end;
      }
    }

    const payments = await this.prisma.payment.findMany({
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

    // Calculate method breakdown totals for valid (non-reversed) payments in this view
    let cashTotal = 0;
    let upiTotal = 0;
    let bankTotal = 0;
    let chequeTotal = 0;
    let grandTotal = 0;

    for (const p of payments) {
      if (!p.isReversed) {
        const amt = Number(p.amount);
        grandTotal += amt;
        if (p.paymentMode === 'CASH') cashTotal += amt;
        else if (p.paymentMode === 'UPI') upiTotal += amt;
        else if (p.paymentMode === 'BANK_TRANSFER') bankTotal += amt;
        else if (p.paymentMode === 'CHEQUE') chequeTotal += amt;
      }
    }

    return {
      payments,
      totals: {
        count: payments.length,
        cashTotal,
        upiTotal,
        bankTotal,
        chequeTotal,
        grandTotal,
      },
    };
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

  async getCustomerPendingDues(customerId: string, membershipId?: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        memberships: {
          where: {
            status: 'ACTIVE',
            ...(membershipId ? { id: membershipId } : {}),
          },
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

    // Most recent payment made by this customer
    const recentPayment = await this.prisma.payment.findFirst({
      where: {
        customerId,
        isReversed: false,
      },
      orderBy: { paymentDate: 'desc' },
      select: {
        id: true,
        receiptNumber: true,
        amount: true,
        paymentDate: true,
        paymentMode: true,
        transactionRef: true,
      },
    });

    const pendingInstallments: any[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (const mem of customer.memberships) {
      const activeGroup = mem.chitGroup;
      for (const inst of activeGroup.installments) {
        if (inst.monthNumber <= activeGroup.currentMonth) {
          const payable = Number(inst.payableAmount);
          const paidAlready = inst.paymentAllocations
            .filter((a) => a.membershipId === mem.id)
            .reduce((sum, a) => sum + Number(a.allocatedAmount), 0);

          const due = Math.max(0, payable - paidAlready);
          if (due > 0.01) {
            const dueDate = new Date(inst.dueDate);
            const isOverdue = dueDate < now;

            const isWeekly = (activeGroup.auctionFrequency || '').toUpperCase() === 'WEEKLY';
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
              isOverdue,
              frequency: activeGroup.auctionFrequency || 'MONTHLY',
              isWeekly,
              periodLabel: isWeekly ? `Week ${inst.monthNumber}` : `Month ${inst.monthNumber}`,
            });
          }
        }
      }
    }

    // Sort: overdue first, then by earliest due date
    pendingInstallments.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    const membershipsSummary = customer.memberships.map((m) => ({
      membershipId: m.id,
      ticketNumber: m.ticketNumber,
      groupId: m.chitGroup.id,
      groupCode: m.chitGroup.groupCode,
      groupName: m.chitGroup.name,
      monthlyContribution: Number(m.chitGroup.monthlyContribution),
      currentMonth: m.chitGroup.currentMonth,
      totalMonths: m.chitGroup.totalMonths,
    }));

    return {
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        phone: customer.phone,
        customerCode: customer.customerCode,
      },
      memberships: membershipsSummary,
      recentPayment: recentPayment
        ? {
            ...recentPayment,
            amount: Number(recentPayment.amount),
          }
        : null,
      pendingInstallments,
      totalDueAmount: pendingInstallments.reduce((sum, i) => sum + i.dueAmount, 0),
    };
  }

  async recordCollection(dto: RecordCollectionDto, receivedById: string) {
    // 1. Idempotency Check: if idempotencyKey already exists, return existing payment immediately
    if (dto.idempotencyKey && dto.idempotencyKey.trim()) {
      const existing = await this.prisma.payment.findUnique({
        where: { idempotencyKey: dto.idempotencyKey.trim() },
        include: {
          customer: true,
          allocations: {
            include: {
              installment: { include: { chitGroup: true } },
              membership: true,
            },
          },
        },
      });
      if (existing) {
        return existing;
      }
    }

    // 2. Validate allocations sum equals the payment amount
    const totalAllocated = dto.allocations.reduce((sum, a) => sum + Number(a.allocatedAmount), 0);
    if (Math.abs(totalAllocated - Number(dto.amount)) > 0.01) {
      throw new BadRequestException(
        `Total allocated amount (₹${totalAllocated.toFixed(2)}) must exactly equal the payment amount (₹${Number(dto.amount).toFixed(2)})`,
      );
    }

    // 3. Validate customer exists and is active
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer ${dto.customerId} not found`);
    }

    // 4. Validate customer, membership, installment relationships & allocation limits
    for (const alloc of dto.allocations) {
      const membership = await this.prisma.membership.findUnique({
        where: { id: alloc.membershipId },
        include: { chitGroup: true },
      });
      if (!membership || membership.customerId !== dto.customerId) {
        throw new BadRequestException(
          `Membership ${alloc.membershipId} does not belong to customer ${customer.fullName}`,
        );
      }

      const installment = await this.prisma.installment.findUnique({
        where: { id: alloc.installmentId },
        include: {
          paymentAllocations: {
            where: {
              membershipId: alloc.membershipId,
              payment: { isReversed: false },
            },
          },
        },
      });

      if (!installment || installment.chitGroupId !== membership.chitGroupId) {
        throw new BadRequestException(
          `Installment ${alloc.installmentId} does not belong to chit group ${membership.chitGroup.groupCode}`,
        );
      }

      // Check remaining balance to prevent over-allocation
      const payableAmount = Number(installment.payableAmount);
      const alreadyPaid = installment.paymentAllocations.reduce(
        (sum, a) => sum + Number(a.allocatedAmount),
        0,
      );
      const remainingDue = Math.max(0, payableAmount - alreadyPaid);

      if (alloc.allocatedAmount > remainingDue + 0.01) {
        throw new BadRequestException(
          `Allocation of ₹${alloc.allocatedAmount} exceeds the remaining balance (₹${remainingDue.toFixed(2)}) for Month ${installment.monthNumber} (Ticket #${membership.ticketNumber})`,
        );
      }
    }

    // 5. Generate unique receipt number
    const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();
    const yyyymm = `${paymentDate.getFullYear()}${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
    const countThisMonth = await this.prisma.payment.count({
      where: {
        receiptNumber: {
          startsWith: `REC-${yyyymm}`,
        },
      },
    });
    const receiptNumber = `REC-${yyyymm}-${String(countThisMonth + 1).padStart(4, '0')}`;

    // 6. Execute atomic database transaction
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          receiptNumber,
          idempotencyKey: dto.idempotencyKey?.trim() || null,
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
            idempotencyKey: dto.idempotencyKey || null,
          },
        },
      });

      return payment;
    });
  }

  async reversePayment(id: string, dto: ReverseCollectionDto, reversedById: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { allocations: true },
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
            reversedAllocationsCount: payment.allocations.length,
          },
        },
      });

      return updated;
    });
  }
}
