import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { CollectionsService } from './collections.service.js';
import { PaymentMode, PaymentStatus } from '@prisma/client';

describe('CollectionsService - Financial Transaction Rules', () => {
  let collectionsService: CollectionsService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      payment: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
        update: vi.fn(),
      },
      paymentAllocation: {
        create: vi.fn(),
      },
      customer: {
        findUnique: vi.fn(),
      },
      membership: {
        findUnique: vi.fn(),
      },
      installment: {
        findUnique: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation(async (cb) => {
        return cb(prismaMock);
      }),
    };

    collectionsService = new CollectionsService(prismaMock);
  });

  it('1. Full payment: should successfully record a full installment payment', async () => {
    prismaMock.customer.findUnique.mockResolvedValue({ id: 'cust-1', fullName: 'Ramesh Verma' });
    prismaMock.membership.findUnique.mockResolvedValue({ id: 'mem-1', customerId: 'cust-1', chitGroupId: 'grp-1', ticketNumber: 1, chitGroup: { groupCode: 'CF-100K' } });
    prismaMock.installment.findUnique.mockResolvedValue({
      id: 'inst-1',
      chitGroupId: 'grp-1',
      monthNumber: 1,
      payableAmount: 5000,
      paymentAllocations: [],
    });
    prismaMock.payment.create.mockResolvedValue({
      id: 'pay-1',
      receiptNumber: 'REC-202610-0001',
      amount: 5000,
      paymentMode: PaymentMode.CASH,
      isReversed: false,
    });

    const result = await collectionsService.recordCollection(
      {
        customerId: 'cust-1',
        amount: 5000,
        paymentMode: PaymentMode.CASH,
        allocations: [{ installmentId: 'inst-1', membershipId: 'mem-1', allocatedAmount: 5000 }],
      },
      'durga-uuid',
    );

    expect(result).toBeDefined();
    expect(result.receiptNumber).toBe('REC-202610-0001');
    expect(prismaMock.paymentAllocation.create).toHaveBeenCalledWith({
      data: {
        paymentId: 'pay-1',
        membershipId: 'mem-1',
        installmentId: 'inst-1',
        allocatedAmount: 5000,
        notes: null,
      },
    });
  });

  it('2. Partial payment: should successfully record a partial payment against an installment', async () => {
    prismaMock.customer.findUnique.mockResolvedValue({ id: 'cust-1', fullName: 'Ramesh Verma' });
    prismaMock.membership.findUnique.mockResolvedValue({ id: 'mem-1', customerId: 'cust-1', chitGroupId: 'grp-1', ticketNumber: 1, chitGroup: { groupCode: 'CF-100K' } });
    prismaMock.installment.findUnique.mockResolvedValue({
      id: 'inst-1',
      chitGroupId: 'grp-1',
      monthNumber: 1,
      payableAmount: 5000,
      paymentAllocations: [],
    });
    prismaMock.payment.create.mockResolvedValue({
      id: 'pay-2',
      receiptNumber: 'REC-202610-0002',
      amount: 2500,
      paymentMode: PaymentMode.UPI,
      isReversed: false,
    });

    const result = await collectionsService.recordCollection(
      {
        customerId: 'cust-1',
        amount: 2500,
        paymentMode: PaymentMode.UPI,
        allocations: [{ installmentId: 'inst-1', membershipId: 'mem-1', allocatedAmount: 2500 }],
      },
      'durga-uuid',
    );

    expect(result).toBeDefined();
    expect(result.amount).toBe(2500);
    expect(prismaMock.paymentAllocation.create).toHaveBeenCalledTimes(1);
  });

  it('3. Multiple installments: should allocate one payment across multiple installments', async () => {
    prismaMock.customer.findUnique.mockResolvedValue({ id: 'cust-1', fullName: 'Ramesh Verma' });
    prismaMock.membership.findUnique.mockResolvedValue({ id: 'mem-1', customerId: 'cust-1', chitGroupId: 'grp-1', ticketNumber: 1, chitGroup: { groupCode: 'CF-100K' } });
    
    prismaMock.installment.findUnique
      .mockResolvedValueOnce({ id: 'inst-1', chitGroupId: 'grp-1', monthNumber: 1, payableAmount: 5000, paymentAllocations: [] })
      .mockResolvedValueOnce({ id: 'inst-2', chitGroupId: 'grp-1', monthNumber: 2, payableAmount: 3300, paymentAllocations: [] });

    prismaMock.payment.create.mockResolvedValue({
      id: 'pay-3',
      receiptNumber: 'REC-202610-0003',
      amount: 8300,
      paymentMode: PaymentMode.BANK_TRANSFER,
      isReversed: false,
    });

    const result = await collectionsService.recordCollection(
      {
        customerId: 'cust-1',
        amount: 8300,
        paymentMode: PaymentMode.BANK_TRANSFER,
        allocations: [
          { installmentId: 'inst-1', membershipId: 'mem-1', allocatedAmount: 5000 },
          { installmentId: 'inst-2', membershipId: 'mem-1', allocatedAmount: 3300 },
        ],
      },
      'durga-uuid',
    );

    expect(result).toBeDefined();
    expect(prismaMock.paymentAllocation.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('4. Duplicate submissions: should return existing payment if idempotencyKey already exists', async () => {
    const existingPayment = {
      id: 'existing-pay-id',
      receiptNumber: 'REC-202610-0099',
      idempotencyKey: 'idemp-uuid-1234',
      amount: 5000,
      isReversed: false,
    };
    prismaMock.payment.findUnique.mockResolvedValue(existingPayment);

    const result = await collectionsService.recordCollection(
      {
        idempotencyKey: 'idemp-uuid-1234',
        customerId: 'cust-1',
        amount: 5000,
        paymentMode: PaymentMode.CASH,
        allocations: [{ installmentId: 'inst-1', membershipId: 'mem-1', allocatedAmount: 5000 }],
      },
      'durga-uuid',
    );

    expect(result).toEqual(existingPayment);
    // Should NOT call create again
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it('5. Invalid allocation amounts: should reject if sum of allocations does not equal payment amount', async () => {
    await expect(
      collectionsService.recordCollection(
        {
          customerId: 'cust-1',
          amount: 5000,
          paymentMode: PaymentMode.CASH,
          allocations: [{ installmentId: 'inst-1', membershipId: 'mem-1', allocatedAmount: 4000 }],
        },
        'durga-uuid',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('6. Over-allocation: should reject if allocation exceeds remaining due on an installment', async () => {
    prismaMock.customer.findUnique.mockResolvedValue({ id: 'cust-1', fullName: 'Ramesh Verma' });
    prismaMock.membership.findUnique.mockResolvedValue({ id: 'mem-1', customerId: 'cust-1', chitGroupId: 'grp-1', ticketNumber: 1, chitGroup: { groupCode: 'CF-100K' } });
    
    // Installment is ₹5,000, but ₹4,000 was already paid previously, so remaining is ₹1,000
    prismaMock.installment.findUnique.mockResolvedValue({
      id: 'inst-1',
      chitGroupId: 'grp-1',
      monthNumber: 1,
      payableAmount: 5000,
      paymentAllocations: [{ allocatedAmount: 4000 }],
    });

    await expect(
      collectionsService.recordCollection(
        {
          customerId: 'cust-1',
          amount: 2000, // trying to allocate ₹2,000 when only ₹1,000 is due
          paymentMode: PaymentMode.CASH,
          allocations: [{ installmentId: 'inst-1', membershipId: 'mem-1', allocatedAmount: 2000 }],
        },
        'durga-uuid',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('7. Payment reversal: should mark payment as REVERSED with reason and write compensating audit log', async () => {
    prismaMock.payment.findUnique.mockResolvedValue({
      id: 'pay-1',
      receiptNumber: 'REC-202610-0001',
      amount: 5000,
      isReversed: false,
      allocations: [{ id: 'alloc-1' }],
    });

    prismaMock.payment.update.mockResolvedValue({
      id: 'pay-1',
      isReversed: true,
      status: PaymentStatus.REVERSED,
      reversalReason: 'Wrong voucher entered from notebook',
    });

    const result = await collectionsService.reversePayment(
      'pay-1',
      { reason: 'Wrong voucher entered from notebook' },
      'durga-uuid',
    );

    expect(result.isReversed).toBe(true);
    expect(prismaMock.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pay-1' },
        data: expect.objectContaining({
          isReversed: true,
          status: PaymentStatus.REVERSED,
          reversalReason: 'Wrong voucher entered from notebook',
        }),
      }),
    );
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: 'PAYMENT',
          action: 'PAYMENT_REVERSED',
        }),
      }),
    );
  });

  it('8. Failed database transaction: should propagate error when transaction fails', async () => {
    prismaMock.customer.findUnique.mockResolvedValue({ id: 'cust-1', fullName: 'Ramesh Verma' });
    prismaMock.membership.findUnique.mockResolvedValue({ id: 'mem-1', customerId: 'cust-1', chitGroupId: 'grp-1', ticketNumber: 1, chitGroup: { groupCode: 'CF-100K' } });
    prismaMock.installment.findUnique.mockResolvedValue({
      id: 'inst-1',
      chitGroupId: 'grp-1',
      monthNumber: 1,
      payableAmount: 5000,
      paymentAllocations: [],
    });

    // Simulate database constraint error in transaction
    prismaMock.$transaction.mockRejectedValue(new Error('PostgreSQL foreign key violation'));

    await expect(
      collectionsService.recordCollection(
        {
          customerId: 'cust-1',
          amount: 5000,
          paymentMode: PaymentMode.CASH,
          allocations: [{ installmentId: 'inst-1', membershipId: 'mem-1', allocatedAmount: 5000 }],
        },
        'durga-uuid',
      ),
    ).rejects.toThrow('PostgreSQL foreign key violation');
  });

  it('9. Register totals: should correctly aggregate Cash, UPI, and Bank totals while excluding reversals', async () => {
    prismaMock.payment.findMany.mockResolvedValue([
      { id: '1', amount: 5000, paymentMode: PaymentMode.CASH, isReversed: false },
      { id: '2', amount: 3300, paymentMode: PaymentMode.UPI, isReversed: false },
      { id: '3', amount: 10000, paymentMode: PaymentMode.BANK_TRANSFER, isReversed: false },
      { id: '4', amount: 5000, paymentMode: PaymentMode.CASH, isReversed: true }, // Should be excluded from totals
    ]);

    const result = await collectionsService.findAll({});

    expect(result.totals.cashTotal).toBe(5000);
    expect(result.totals.upiTotal).toBe(3300);
    expect(result.totals.bankTotal).toBe(10000);
    expect(result.totals.grandTotal).toBe(18300);
    expect(result.totals.count).toBe(4);
  });
});
