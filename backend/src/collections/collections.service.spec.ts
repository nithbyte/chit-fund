import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { CollectionsService } from './collections.service.js';
import { PaymentMode } from '@prisma/client';

describe('CollectionsService', () => {
  let collectionsService: CollectionsService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      payment: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
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
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation((cb) => cb(prismaMock)),
    };

    collectionsService = new CollectionsService(prismaMock);
  });

  it('should reject collection entry when allocated amounts do not sum to total payment amount', async () => {
    await expect(
      collectionsService.recordCollection(
        {
          customerId: 'cust-uuid-1',
          amount: 5000,
          paymentMode: PaymentMode.CASH,
          allocations: [
            {
              installmentId: 'inst-1',
              membershipId: 'mem-1',
              allocatedAmount: 3000, // Missing 2000
            },
          ],
        },
        'user-uuid-durga',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should successfully record manual payment and allocations when amounts match', async () => {
    prismaMock.customer.findUnique.mockResolvedValue({
      id: 'cust-uuid-1',
      fullName: 'Ramesh Verma',
    });

    prismaMock.payment.create.mockResolvedValue({
      id: 'pay-uuid-1',
      receiptNumber: 'REC-202610-0001',
      amount: 5000,
      paymentMode: PaymentMode.CASH,
      isReversed: false,
    });

    const result = await collectionsService.recordCollection(
      {
        customerId: 'cust-uuid-1',
        amount: 5000,
        paymentMode: PaymentMode.CASH,
        allocations: [
          {
            installmentId: 'inst-1',
            membershipId: 'mem-1',
            allocatedAmount: 3000,
          },
          {
            installmentId: 'inst-2',
            membershipId: 'mem-1',
            allocatedAmount: 2000,
          },
        ],
      },
      'user-uuid-durga',
    );

    expect(result).toBeDefined();
    expect(result.receiptNumber).toBe('REC-202610-0001');
    expect(prismaMock.paymentAllocation.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(1);
  });
});
