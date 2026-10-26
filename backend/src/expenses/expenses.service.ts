import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: { startDate?: string; endDate?: string; category?: string }) {
    const where: any = {};

    if (filters?.startDate || filters?.endDate) {
      where.expenseDate = {};
      if (filters.startDate) where.expenseDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.expenseDate.lte = new Date(filters.endDate);
    }

    if (filters?.category && filters.category !== 'ALL') {
      where.category = { equals: filters.category.trim(), mode: 'insensitive' };
    }

    const expenses = await this.prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
      include: {
        recordedBy: {
          select: { id: true, fullName: true, username: true },
        },
      },
    });

    let totalAmount = 0;
    const categoryTotals: Record<string, number> = {};
    const modeTotals: Record<string, number> = {
      CASH: 0,
      UPI: 0,
      BANK_TRANSFER: 0,
      CHEQUE: 0,
    };

    for (const exp of expenses) {
      const amt = Number(exp.amount);
      totalAmount += amt;
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + amt;
      if (modeTotals[exp.paymentMode] !== undefined) {
        modeTotals[exp.paymentMode] += amt;
      }
    }

    return {
      expenses: expenses.map((e) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        amount: Number(e.amount),
        expenseDate: e.expenseDate,
        paymentMode: e.paymentMode,
        reference: e.reference,
        notes: e.notes,
        recordedBy: e.recordedBy.fullName,
        createdAt: e.createdAt,
      })),
      totals: {
        count: expenses.length,
        totalAmount,
        categoryTotals,
        modeTotals,
      },
    };
  }

  async create(dto: CreateExpenseDto, recordedById: string) {
    const expenseDate = dto.expenseDate ? new Date(dto.expenseDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          title: dto.title.trim(),
          category: dto.category.toUpperCase().trim(),
          amount: dto.amount,
          expenseDate,
          paymentMode: dto.paymentMode,
          reference: dto.reference?.trim() || null,
          notes: dto.notes?.trim() || null,
          recordedById,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'EXPENSE',
          entityId: expense.id,
          action: 'EXPENSE_RECORDED',
          performedById: recordedById,
          metadata: {
            title: expense.title,
            category: expense.category,
            amount: Number(expense.amount),
            paymentMode: expense.paymentMode,
          },
        },
      });

      return expense;
    });
  }

  async remove(id: string, performedById: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
    });
    if (!expense) throw new NotFoundException(`Expense ${id} not found`);

    return this.prisma.$transaction(async (tx) => {
      await tx.expense.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          entityType: 'EXPENSE',
          entityId: id,
          action: 'EXPENSE_DELETED',
          performedById,
          metadata: {
            title: expense.title,
            amount: Number(expense.amount),
          },
        },
      });

      return { success: true, message: `Expense ${expense.title} deleted` };
    });
  }
}
