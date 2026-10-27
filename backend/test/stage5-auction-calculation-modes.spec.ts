import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Auction Calculation Modes & Financial Safeguards (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let customerId1: string;
  let customerId2: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  const runId = Date.now().toString().slice(-6);

  afterAll(async () => {
    await app.close();
  });

  it('Step 1: Auth - Owner Durga logs in and retrieves test customers', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'durga', password: 'Durga@Chit2026!' });

    expect(res.status).toBe(200);
    authToken = res.body.accessToken;

    const custRes = await request(app.getHttpServer())
      .get('/customers?limit=5')
      .set('Authorization', `Bearer ${authToken}`);

    expect(custRes.status).toBe(200);
    expect(custRes.body.items.length).toBeGreaterThanOrEqual(2);
    customerId1 = custRes.body.items[0].id;
    customerId2 = custRes.body.items[1].id;
  });

  describe('Mode 1: Discount-Based Auction', () => {
    let discountGroupId: string;
    let member1Id: string;
    let member2Id: string;

    it('creates group configured as DISCOUNT_BASED with approved 5% commission', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/chit-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          groupCode: `DISC-GRP-${runId}`,
          name: 'Discount Based Test Chit',
          chitType: 'AUCTION_BASED',
          auctionCalculationMode: 'DISCOUNT_BASED',
          totalValue: 100000,
          monthlyContribution: 5000,
          totalMonths: 20,
          startDate: '2026-11-01',
          commissionType: 'PERCENTAGE_OF_CHIT_VALUE',
          commissionRate: 5.0,
          isCommissionConfirmed: true,
          minBidDiscount: 5000,
          maxBidDiscount: 40000,
          status: 'ACTIVE',
        });

      expect(createRes.status).toBe(201);
      discountGroupId = createRes.body.id;
      expect(createRes.body.auctionCalculationMode).toBe('DISCOUNT_BASED');

      // Enroll 2 members
      const enroll1 = await request(app.getHttpServer())
        .post(`/chit-groups/${discountGroupId}/enroll`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ customerId: customerId1, ticketNumber: 1 });
      expect(enroll1.status).toBe(201);
      member1Id = enroll1.body.id;

      const enroll2 = await request(app.getHttpServer())
        .post(`/chit-groups/${discountGroupId}/enroll`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ customerId: customerId2, ticketNumber: 2 });
      expect(enroll2.status).toBe(201);
      member2Id = enroll2.body.id;
    });

    it('previews discount auction calculations before applying', async () => {
      const previewRes = await request(app.getHttpServer())
        .post('/auctions/preview')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chitGroupId: discountGroupId,
          monthNumber: 1,
          auctionCalculationMode: 'DISCOUNT_BASED',
          winningBidAmount: 20000,
          winningMembershipId: member1Id,
        });

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.auctionCalculationMode).toBe('DISCOUNT_BASED');
      expect(previewRes.body.winningBidAmount).toBe(20000);
      expect(previewRes.body.foremanCommission).toBe(5000); // 5% of 100k
      expect(previewRes.body.dividendTotal).toBe(15000); // 20k - 5k
      expect(previewRes.body.dividendPerMember).toBe(750); // 15k / 20 members
      expect(previewRes.body.netPrizeAmount).toBe(80000); // 100k - 20k
      expect(previewRes.body.nextInstallmentPayable).toBe(4250); // 5000 - 750
      expect(previewRes.body.isDuplicate).toBe(false);
      expect(previewRes.body.winnerError).toBeNull();
    });

    it('records Month 1 discount auction, updates member and installment ledger atomically', async () => {
      const auctionRes = await request(app.getHttpServer())
        .post('/auctions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chitGroupId: discountGroupId,
          monthNumber: 1,
          auctionDate: '2026-11-10T11:00:00.000Z',
          auctionCalculationMode: 'DISCOUNT_BASED',
          winningBidAmount: 20000,
          winningMembershipId: member1Id,
          notes: 'Competitive 8 bids closed',
        });

      expect(auctionRes.status).toBe(201);
      expect(auctionRes.body.auctionCalculationMode).toBe('DISCOUNT_BASED');
      expect(Number(auctionRes.body.winningBidAmount)).toBe(20000);
      expect(Number(auctionRes.body.foremanCommission)).toBe(5000);
      expect(Number(auctionRes.body.dividendTotal)).toBe(15000);
      expect(Number(auctionRes.body.dividendPerMember)).toBe(750);
      expect(Number(auctionRes.body.netPrizeAmount)).toBe(80000);

      // Verify winning member is prized
      const memberCheck = await prisma.membership.findUnique({
        where: { id: member1Id },
      });
      expect(memberCheck?.isPrized).toBe(true);
      expect(memberCheck?.prizedMonth).toBe(1);
      expect(Number(memberCheck?.prizeAmount)).toBe(80000);

      // Verify Month 1 installment was updated with dividend
      const instCheck = await prisma.installment.findUnique({
        where: {
          chitGroupId_monthNumber: {
            chitGroupId: discountGroupId,
            monthNumber: 1,
          },
        },
      });
      expect(Number(instCheck?.dividendPerTicket)).toBe(750);
      expect(Number(instCheck?.payableAmount)).toBe(4250);

      // Financial safeguard: Payout voucher is NOT automatically created
      const payoutCount = await prisma.payout.count({
        where: { auctionId: auctionRes.body.id },
      });
      expect(payoutCount).toBe(0);
    });

    it('Zero Discount Safeguard: Never generates dividends when no discount exists (winningBid = 0)', async () => {
      // Month 2: Zero discount auction (member agreed to 0 discount bid)
      const zeroDiscountAuction = await request(app.getHttpServer())
        .post('/auctions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chitGroupId: discountGroupId,
          monthNumber: 2,
          auctionDate: '2026-12-10T11:00:00.000Z',
          auctionCalculationMode: 'DISCOUNT_BASED',
          winningBidAmount: 0,
          winningMembershipId: member2Id,
          notes: 'Lottery draw round with 0 discount',
        });

      expect(zeroDiscountAuction.status).toBe(201);
      expect(Number(zeroDiscountAuction.body.winningBidAmount)).toBe(0);
      // Safeguard: Never generate dividends when no discount exists
      expect(Number(zeroDiscountAuction.body.dividendTotal)).toBe(0);
      expect(Number(zeroDiscountAuction.body.dividendPerMember)).toBe(0);
      expect(Number(zeroDiscountAuction.body.netPrizeAmount)).toBe(100000); // 100k - 0

      // Installment payable amount remains base amount (5000 - 0 = 5000)
      const inst2Check = await prisma.installment.findUnique({
        where: {
          chitGroupId_monthNumber: {
            chitGroupId: discountGroupId,
            monthNumber: 2,
          },
        },
      });
      expect(Number(inst2Check?.dividendPerTicket)).toBe(0);
      expect(Number(inst2Check?.payableAmount)).toBe(5000);
    });
  });

  describe('Mode 2: Fixed Payout / No Discount', () => {
    let fixedGroupId: string;
    let fixedMember1Id: string;
    let fixedMember2Id: string;

    it('creates group configured as FIXED_PAYOUT with scheme terms', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/chit-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          groupCode: `FIXED-GRP-${runId}`,
          name: 'Fixed Payout 1 Lakh Chit',
          chitType: 'AUCTION_BASED',
          auctionCalculationMode: 'FIXED_PAYOUT',
          totalValue: 100000,
          monthlyContribution: 5000,
          totalMonths: 20,
          startDate: '2026-11-01',
          fixedPayoutAmount: 95000, // Fixed agreed payout per scheme terms
          fixedPayoutAdjustments: 1000, // Separately configured adjustment
          commissionType: 'NO_COMMISSION',
          isCommissionConfirmed: false,
          status: 'ACTIVE',
        });

      expect(createRes.status).toBe(201);
      fixedGroupId = createRes.body.id;
      expect(createRes.body.auctionCalculationMode).toBe('FIXED_PAYOUT');
      expect(Number(createRes.body.fixedPayoutAmount)).toBe(95000);
      expect(Number(createRes.body.fixedPayoutAdjustments)).toBe(1000);

      // Enroll members
      const enroll1 = await request(app.getHttpServer())
        .post(`/chit-groups/${fixedGroupId}/enroll`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ customerId: customerId1, ticketNumber: 1 });
      expect(enroll1.status).toBe(201);
      fixedMember1Id = enroll1.body.id;

      const enroll2 = await request(app.getHttpServer())
        .post(`/chit-groups/${fixedGroupId}/enroll`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ customerId: customerId2, ticketNumber: 2 });
      expect(enroll2.status).toBe(201);
      fixedMember2Id = enroll2.body.id;
    });

    it('previews fixed payout calculations: sets discount & dividend to 0, does not assume payout equals chit value', async () => {
      const previewRes = await request(app.getHttpServer())
        .post('/auctions/preview')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chitGroupId: fixedGroupId,
          monthNumber: 1,
          auctionCalculationMode: 'FIXED_PAYOUT',
          fixedPayoutAmount: 95000,
          adjustmentAmount: 1000,
          winningMembershipId: fixedMember1Id,
        });

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.auctionCalculationMode).toBe('FIXED_PAYOUT');
      expect(previewRes.body.winningBidAmount).toBe(0); // Discount is zero
      expect(previewRes.body.dividendTotal).toBe(0); // Nonexistent discount produces 0 dividend
      expect(previewRes.body.dividendPerMember).toBe(0);
      expect(previewRes.body.fixedPayoutAmount).toBe(95000);
      expect(previewRes.body.adjustmentAmount).toBe(1000);
      expect(previewRes.body.netPrizeAmount).toBe(94000); // 95000 - 1000
      expect(previewRes.body.nextInstallmentPayable).toBe(5000); // No dividend deduction
    });

    it('records Month 1 fixed payout auction without assuming 5% commission or generating dividends', async () => {
      const auctionRes = await request(app.getHttpServer())
        .post('/auctions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chitGroupId: fixedGroupId,
          monthNumber: 1,
          auctionDate: '2026-11-15T10:00:00.000Z',
          auctionCalculationMode: 'FIXED_PAYOUT',
          fixedPayoutAmount: 95000,
          adjustmentAmount: 1000,
          winningMembershipId: fixedMember1Id,
          notes: 'Agreed fixed round 1 distribution',
        });

      expect(auctionRes.status).toBe(201);
      expect(auctionRes.body.auctionCalculationMode).toBe('FIXED_PAYOUT');
      expect(Number(auctionRes.body.winningBidAmount)).toBe(0);
      expect(Number(auctionRes.body.dividendTotal)).toBe(0);
      expect(Number(auctionRes.body.dividendPerMember)).toBe(0);
      expect(Number(auctionRes.body.fixedPayoutAmount)).toBe(95000);
      expect(Number(auctionRes.body.adjustmentAmount)).toBe(1000);
      expect(Number(auctionRes.body.netPrizeAmount)).toBe(94000);

      // Verify installment payableAmount remains base contribution (no dividend deduction)
      const instCheck = await prisma.installment.findUnique({
        where: {
          chitGroupId_monthNumber: {
            chitGroupId: fixedGroupId,
            monthNumber: 1,
          },
        },
      });
      expect(Number(instCheck?.dividendPerTicket)).toBe(0);
      expect(Number(instCheck?.payableAmount)).toBe(5000);

      // Verify member is prized with net prize of 94,000
      const memberCheck = await prisma.membership.findUnique({
        where: { id: fixedMember1Id },
      });
      expect(memberCheck?.isPrized).toBe(true);
      expect(Number(memberCheck?.prizeAmount)).toBe(94000);
    });

    it('Safeguard: Requires explicit fixedPayoutAmount if not configured on group (does not assume totalValue)', async () => {
      // Create group without configured fixed payout
      const unconfiguredGroup = await request(app.getHttpServer())
        .post('/chit-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          groupCode: `UNCONF-FIXED-${runId}`,
          name: 'Unconfigured Fixed Group',
          chitType: 'AUCTION_BASED',
          auctionCalculationMode: 'FIXED_PAYOUT',
          totalValue: 50000,
          monthlyContribution: 5000,
          totalMonths: 10,
          startDate: '2026-11-01',
          status: 'ACTIVE',
        });
      expect(unconfiguredGroup.status).toBe(201);
      const unconfGroupId = unconfiguredGroup.body.id;

      const enroll = await request(app.getHttpServer())
        .post(`/chit-groups/${unconfGroupId}/enroll`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ customerId: customerId1, ticketNumber: 1 });
      const memId = enroll.body.id;

      // Attempting to record fixed payout auction without specifying fixedPayoutAmount
      const badRes = await request(app.getHttpServer())
        .post('/auctions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chitGroupId: unconfGroupId,
          monthNumber: 1,
          auctionDate: '2026-11-15',
          auctionCalculationMode: 'FIXED_PAYOUT',
          winningMembershipId: memId,
        });

      // Must be rejected - do not assume winner payout equals chit value!
      expect(badRes.status).toBe(400);
      expect(badRes.body.message).toContain('Fixed agreed winner payout must be specified');
    });
  });

  describe('Financial Safeguards & Validation', () => {
    let testGroupId: string;
    let testMember1Id: string;
    let testMember2Id: string;

    beforeAll(async () => {
      const createRes = await request(app.getHttpServer())
        .post('/chit-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          groupCode: `SAFEGUARD-GRP-${runId}`,
          name: 'Safeguard Test Group',
          chitType: 'AUCTION_BASED',
          totalValue: 100000,
          monthlyContribution: 5000,
          totalMonths: 20,
          startDate: '2026-11-01',
          minBidDiscount: 10000,
          maxBidDiscount: 40000,
          status: 'ACTIVE',
        });

      testGroupId = createRes.body.id;

      const enroll1 = await request(app.getHttpServer())
        .post(`/chit-groups/${testGroupId}/enroll`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ customerId: customerId1, ticketNumber: 1 });
      testMember1Id = enroll1.body.id;

      const enroll2 = await request(app.getHttpServer())
        .post(`/chit-groups/${testGroupId}/enroll`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ customerId: customerId2, ticketNumber: 2 });
      testMember2Id = enroll2.body.id;
    });

    it('Safeguard: Rejects negative winning bid discount', async () => {
      const res = await request(app.getHttpServer())
        .post('/auctions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chitGroupId: testGroupId,
          monthNumber: 1,
          auctionDate: '2026-11-10',
          auctionCalculationMode: 'DISCOUNT_BASED',
          winningBidAmount: -5000,
          winningMembershipId: testMember1Id,
        });

      expect(res.status).toBe(400);
    });

    it('Safeguard: Rejects winning bid discount exceeding total chit value', async () => {
      const res = await request(app.getHttpServer())
        .post('/auctions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chitGroupId: testGroupId,
          monthNumber: 1,
          auctionDate: '2026-11-10',
          auctionCalculationMode: 'DISCOUNT_BASED',
          winningBidAmount: 120000, // > 100,000 totalValue
          winningMembershipId: testMember1Id,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('cannot exceed total chit value');
    });

    it('Safeguard: Rejects winning bid discount exceeding group ceiling', async () => {
      const res = await request(app.getHttpServer())
        .post('/auctions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chitGroupId: testGroupId,
          monthNumber: 1,
          auctionDate: '2026-11-10',
          auctionCalculationMode: 'DISCOUNT_BASED',
          winningBidAmount: 50000, // > maxBidDiscount of 40,000
          winningMembershipId: testMember1Id,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('exceeds group ceiling');
    });

    it('Safeguard: Rejects fixed payout exceeding total chit value', async () => {
      const res = await request(app.getHttpServer())
        .post('/auctions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chitGroupId: testGroupId,
          monthNumber: 1,
          auctionDate: '2026-11-10',
          auctionCalculationMode: 'FIXED_PAYOUT',
          fixedPayoutAmount: 150000, // > 100,000
          winningMembershipId: testMember1Id,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('cannot exceed total chit value');
    });

    it('Safeguard: Rejects adjustments exceeding fixed payout amount', async () => {
      const res = await request(app.getHttpServer())
        .post('/auctions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chitGroupId: testGroupId,
          monthNumber: 1,
          auctionDate: '2026-11-10',
          auctionCalculationMode: 'FIXED_PAYOUT',
          fixedPayoutAmount: 80000,
          adjustmentAmount: 85000, // > 80,000
          winningMembershipId: testMember1Id,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Adjustment amount cannot exceed fixed payout');
    });

    it('Safeguard: Rejects invalid auction month outside 1..totalMonths', async () => {
      const res = await request(app.getHttpServer())
        .post('/auctions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chitGroupId: testGroupId,
          monthNumber: 25, // > totalMonths of 20
          auctionDate: '2026-11-10',
          auctionCalculationMode: 'DISCOUNT_BASED',
          winningBidAmount: 20000,
          winningMembershipId: testMember1Id,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('outside group duration');
    });

    it('Safeguard: Records Month 1 auction, then rejects DUPLICATE auction for same group & period', async () => {
      // 1. Record Month 1 auction
      const firstAuction = await request(app.getHttpServer())
        .post('/auctions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chitGroupId: testGroupId,
          monthNumber: 1,
          auctionDate: '2026-11-10',
          auctionCalculationMode: 'DISCOUNT_BASED',
          winningBidAmount: 20000,
          winningMembershipId: testMember1Id,
        });
      expect(firstAuction.status).toBe(201);

      // 2. Attempt duplicate auction for Month 1
      const duplicateRes = await request(app.getHttpServer())
        .post('/auctions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chitGroupId: testGroupId,
          monthNumber: 1,
          auctionDate: '2026-11-10',
          auctionCalculationMode: 'DISCOUNT_BASED',
          winningBidAmount: 25000,
          winningMembershipId: testMember2Id,
        });

      expect(duplicateRes.status).toBe(400);
      expect(duplicateRes.body.message).toContain('already recorded');
    });

    it('Safeguard: Rejects auction with member who is already prized', async () => {
      // Attempt to conduct Month 2 with member1 who already won Month 1
      const res = await request(app.getHttpServer())
        .post('/auctions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chitGroupId: testGroupId,
          monthNumber: 2,
          auctionDate: '2026-12-10',
          auctionCalculationMode: 'DISCOUNT_BASED',
          winningBidAmount: 20000,
          winningMembershipId: testMember1Id, // Already prized!
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already won a previous auction');
    });

    it('Safeguard: Atomic Transaction Rollback ensures zero partial state', async () => {
      // Attempt to record Month 2 auction with a winningMembershipId that does not exist
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      const failRes = await request(app.getHttpServer())
        .post('/auctions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chitGroupId: testGroupId,
          monthNumber: 2,
          auctionDate: '2026-12-10',
          auctionCalculationMode: 'DISCOUNT_BASED',
          winningBidAmount: 20000,
          winningMembershipId: fakeUuid,
        });

      expect(failRes.status).toBe(400);

      // Verify no auction was saved for Month 2
      const auctionCount = await prisma.auction.count({
        where: { chitGroupId: testGroupId, monthNumber: 2 },
      });
      expect(auctionCount).toBe(0);

      // Verify Month 2 installment was NOT modified
      const inst2 = await prisma.installment.findUnique({
        where: {
          chitGroupId_monthNumber: {
            chitGroupId: testGroupId,
            monthNumber: 2,
          },
        },
      });
      expect(inst2?.auctionId).toBeNull();
      expect(Number(inst2?.dividendPerTicket)).toBe(0);
    });

    it('Preservation: Configured auction calculation mode is preserved historically', async () => {
      const allAuctions = await request(app.getHttpServer())
        .get(`/auctions?chitGroupId=${testGroupId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(allAuctions.status).toBe(200);
      expect(allAuctions.body.length).toBeGreaterThan(0);
      const m1 = allAuctions.body.find((a: any) => a.monthNumber === 1);
      expect(m1.auctionCalculationMode).toBe('DISCOUNT_BASED');
    });
  });
});
