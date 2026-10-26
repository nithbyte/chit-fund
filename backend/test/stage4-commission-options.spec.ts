import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { AppModule } from '../src/app.module.js';

describe('Chit Scheme Creation: Configurable Commission Options & Safeguards (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let customerId: string;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('Auth: Owner Durga logs in and retrieves customer for membership tests', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'durga', password: 'Durga@Chit2026!' });

    expect(res.status).toBe(200);
    authToken = res.body.accessToken;

    const custRes = await request(app.getHttpServer())
      .get('/customers?limit=1')
      .set('Authorization', `Bearer ${authToken}`);
    customerId = custRes.body.items[0].id;
    expect(customerId).toBeDefined();
  });

  it('Validation Safeguard: Rejects invalid percentage rates (> 100 or negative)', async () => {
    const res = await request(app.getHttpServer())
      .post('/chit-groups')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        groupCode: 'COMM-INVALID-RATE',
        name: 'Invalid Commission Test',
        chitType: 'AUCTION_BASED',
        totalValue: 100000,
        monthlyContribution: 5000,
        totalMonths: 20,
        startDate: '2026-11-01',
        commissionType: 'PERCENTAGE_OF_CHIT_VALUE',
        commissionRate: 150, // Invalid: exceeds 100%
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Percentage of Chit Value requires a valid commission rate');
  });

  it('Validation Safeguard: Rejects negative fixed amount fees', async () => {
    const res = await request(app.getHttpServer())
      .post('/chit-groups')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        groupCode: 'COMM-INVALID-FEE',
        name: 'Invalid Fee Test',
        chitType: 'AUCTION_BASED',
        totalValue: 100000,
        monthlyContribution: 5000,
        totalMonths: 20,
        startDate: '2026-11-01',
        commissionType: 'FIXED_AMOUNT_PER_INSTALLMENT',
        commissionAmount: -500, // Invalid: negative fee
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Fixed Amount per Installment requires a non-negative INR amount');
  });

  it('Validation Safeguard: Rejects Custom / Other commission without explicit rules notes', async () => {
    const res = await request(app.getHttpServer())
      .post('/chit-groups')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        groupCode: 'COMM-INVALID-CUSTOM',
        name: 'Invalid Custom Commission Test',
        chitType: 'AUCTION_BASED',
        totalValue: 100000,
        monthlyContribution: 5000,
        totalMonths: 20,
        startDate: '2026-11-01',
        commissionType: 'CUSTOM_OTHER',
        commissionNotes: '', // Missing required formula
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Custom / Other commission type requires an explicit description');
  });

  it('Option 1: Creates scheme with NO_COMMISSION (0% organizer fee)', async () => {
    const res = await request(app.getHttpServer())
      .post('/chit-groups')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        groupCode: 'COMM-TEST-NO-COMM',
        name: 'Zero Commission Community Scheme',
        chitType: 'FIXED_INSTALLMENT',
        totalValue: 10400,
        monthlyContribution: 200,
        totalMonths: 52,
        startDate: '2026-11-01',
        auctionFrequency: 'WEEKLY',
        commissionType: 'NO_COMMISSION',
        isCommissionConfirmed: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.commissionType).toBe('NO_COMMISSION');
    expect(res.body.isCommissionConfirmed).toBe(true);
  });

  it('Option 2: Creates scheme with PERCENTAGE_OF_CHIT_VALUE (5% of ₹1,00,000 = ₹5,000)', async () => {
    const res = await request(app.getHttpServer())
      .post('/chit-groups')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        groupCode: 'COMM-TEST-PCT-CHIT',
        name: 'Standard 5% Chit Value Scheme',
        chitType: 'AUCTION_BASED',
        totalValue: 100000,
        monthlyContribution: 5000,
        totalMonths: 20,
        startDate: '2026-11-01',
        commissionType: 'PERCENTAGE_OF_CHIT_VALUE',
        commissionRate: 5.0,
        commissionCalculationBase: 'CHIT_VALUE',
        isCommissionConfirmed: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.commissionType).toBe('PERCENTAGE_OF_CHIT_VALUE');
    expect(Number(res.body.commissionRate)).toBe(5.0);
    expect(res.body.isCommissionConfirmed).toBe(true);
  });

  it('Option 3: Creates scheme with PERCENTAGE_OF_EACH_COLLECTION', async () => {
    const res = await request(app.getHttpServer())
      .post('/chit-groups')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        groupCode: 'COMM-TEST-PCT-COLL',
        name: '4% Collection Fee Scheme',
        chitType: 'AUCTION_BASED',
        totalValue: 100000,
        monthlyContribution: 5000,
        totalMonths: 20,
        startDate: '2026-11-01',
        commissionType: 'PERCENTAGE_OF_EACH_COLLECTION',
        commissionRate: 4.0,
        commissionCalculationBase: 'COLLECTIONS',
        isCommissionConfirmed: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.commissionType).toBe('PERCENTAGE_OF_EACH_COLLECTION');
    expect(Number(res.body.commissionRate)).toBe(4.0);
  });

  it('Option 4: Creates scheme with FIXED_AMOUNT_PER_INSTALLMENT', async () => {
    const res = await request(app.getHttpServer())
      .post('/chit-groups')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        groupCode: 'COMM-TEST-FIXED-INST',
        name: '₹300 per installment fee scheme',
        chitType: 'AUCTION_BASED',
        totalValue: 100000,
        monthlyContribution: 5000,
        totalMonths: 20,
        startDate: '2026-11-01',
        commissionType: 'FIXED_AMOUNT_PER_INSTALLMENT',
        commissionAmount: 300,
        commissionCalculationBase: 'PER_INSTALLMENT',
        isCommissionConfirmed: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.commissionType).toBe('FIXED_AMOUNT_PER_INSTALLMENT');
    expect(Number(res.body.commissionAmount)).toBe(300);
  });

  it('Option 5: Creates scheme with FIXED_AMOUNT_PER_CHIT_GROUP', async () => {
    const res = await request(app.getHttpServer())
      .post('/chit-groups')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        groupCode: 'COMM-TEST-FIXED-GRP',
        name: '₹6,000 flat group fee scheme',
        chitType: 'AUCTION_BASED',
        totalValue: 100000,
        monthlyContribution: 5000,
        totalMonths: 20,
        startDate: '2026-11-01',
        commissionType: 'FIXED_AMOUNT_PER_CHIT_GROUP',
        commissionAmount: 6000,
        commissionCalculationBase: 'PER_GROUP',
        isCommissionConfirmed: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.commissionType).toBe('FIXED_AMOUNT_PER_CHIT_GROUP');
    expect(Number(res.body.commissionAmount)).toBe(6000);
  });

  it('Option 6: Creates scheme with AUCTION_BASED_EARNINGS', async () => {
    const res = await request(app.getHttpServer())
      .post('/chit-groups')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        groupCode: 'COMM-TEST-AUCT-EARN',
        name: 'Auction Spread Sharing Scheme',
        chitType: 'AUCTION_BASED',
        totalValue: 100000,
        monthlyContribution: 5000,
        totalMonths: 20,
        startDate: '2026-11-01',
        commissionType: 'AUCTION_BASED_EARNINGS',
        commissionRate: 5.0,
        commissionNotes: 'Foreman retains statutory 5% quota; remainder distributed as member dividend.',
        isCommissionConfirmed: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.commissionType).toBe('AUCTION_BASED_EARNINGS');
  });

  it('Option 7: Creates scheme with CUSTOM_OTHER and explicit formula', async () => {
    const res = await request(app.getHttpServer())
      .post('/chit-groups')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        groupCode: 'COMM-TEST-CUSTOM-RULE',
        name: 'Custom Partnership Scheme',
        chitType: 'AUCTION_BASED',
        totalValue: 100000,
        monthlyContribution: 5000,
        totalMonths: 20,
        startDate: '2026-11-01',
        commissionType: 'CUSTOM_OTHER',
        commissionAmount: 4500,
        commissionNotes: 'Custom tiered management fee agreed under Scheme Schedule Section 3B.',
        isCommissionConfirmed: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.commissionType).toBe('CUSTOM_OTHER');
    expect(res.body.commissionNotes).toContain('Custom tiered management fee');
  });

  it('Draft Safeguard: Scheme created as NOT_CONFIGURED does NOT deduct commission in auction', async () => {
    // 1. Create group with NOT_CONFIGURED commission
    const createRes = await request(app.getHttpServer())
      .post('/chit-groups')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        groupCode: 'COMM-TEST-UNCONFIRMED',
        name: 'Unconfirmed Commission Scheme',
        chitType: 'AUCTION_BASED',
        totalValue: 100000,
        monthlyContribution: 5000,
        totalMonths: 20,
        startDate: '2026-11-01',
        commissionType: 'NOT_CONFIGURED',
        isCommissionConfirmed: false,
        status: 'ACTIVE',
      });

    expect(createRes.status).toBe(201);
    const groupId = createRes.body.id;
    expect(createRes.body.isCommissionConfirmed).toBe(false);

    // 2. Enroll winning member
    const enrollRes = await request(app.getHttpServer())
      .post(`/chit-groups/${groupId}/enroll`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId,
        ticketNumber: 1,
      });
    expect(enrollRes.status).toBe(201);
    const membershipId = enrollRes.body.id;

    // 3. Conduct auction: Since commission terms are unconfirmed, foremanCommission MUST be 0!
    const auctionRes = await request(app.getHttpServer())
      .post('/auctions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        chitGroupId: groupId,
        monthNumber: 1,
        auctionDate: '2026-11-10',
        winningBidAmount: 20000,
        winningMembershipId: membershipId,
      });

    expect(auctionRes.status).toBe(201);
    expect(Number(auctionRes.body.foremanCommission)).toBe(0); // 0 commission deducted!
    // Full ₹20,000 bid discount goes to members
    expect(Number(auctionRes.body.dividendTotal)).toBe(20000);
    expect(Number(auctionRes.body.dividendPerMember)).toBe(1000); // 20000 / 20 = 1000
    expect(Number(auctionRes.body.netPrizeAmount)).toBe(80000); // 100000 - 20000

    // 4. Update commission terms via PATCH /chit-groups/:id/commission
    const updateRes = await request(app.getHttpServer())
      .patch(`/chit-groups/${groupId}/commission`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        commissionType: 'PERCENTAGE_OF_CHIT_VALUE',
        commissionRate: 5.0,
        isCommissionConfirmed: true,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.commissionType).toBe('PERCENTAGE_OF_CHIT_VALUE');
    expect(updateRes.body.isCommissionConfirmed).toBe(true);

    // 5. Historical Record Preservation: Past auction record must remain untouched at ₹0 commission!
    const checkAuction = await request(app.getHttpServer())
      .get(`/auctions?chitGroupId=${groupId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(checkAuction.status).toBe(200);
    const pastAuction = checkAuction.body.find((a: any) => a.monthNumber === 1);
    expect(Number(pastAuction.foremanCommission)).toBe(0); // Untouched and preserved!
  });
});
