import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { AppModule } from '../src/app.module.js';

describe('Updated Business Requirements: Scheme A (Diwali Weekly) & Scheme B (₹1 Lakh) (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let customerId: string;
  let diwaliGroupId: string;
  let diwaliMembershipId: string;
  let lakhGroupId: string;

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

  it('Auth: Owner Durga logs in and obtains JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'durga', password: 'Durga@Chit2026!' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    authToken = res.body.accessToken;

    const custRes = await request(app.getHttpServer())
      .get('/customers?limit=1')
      .set('Authorization', `Bearer ${authToken}`);
    customerId = custRes.body.items[0].id;
  });

  it('Templates: GET /chit-groups/templates returns Scheme A (Diwali Weekly) & Scheme B (₹1 Lakh)', async () => {
    const res = await request(app.getHttpServer())
      .get('/chit-groups/templates')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const diwaliTmpl = res.body.find((t: any) => t.templateId === 'TEMPLATE_DIWALI_WEEKLY');
    expect(diwaliTmpl).toBeDefined();
    expect(diwaliTmpl.frequency).toBe('WEEKLY');
    expect(diwaliTmpl.installmentAmount).toBe(200);
    expect(diwaliTmpl.durationPeriods).toBe(52);
    expect(diwaliTmpl.expectedMemberContribution).toBe(10400);

    const lakhTmpl = res.body.find((t: any) => t.templateId === 'TEMPLATE_1_LAKH_MONTHLY');
    expect(lakhTmpl).toBeDefined();
    expect(lakhTmpl.frequency).toBe('MONTHLY');
    expect(lakhTmpl.installmentAmount).toBe(5000);
    expect(lakhTmpl.durationPeriods).toBe(20);
    expect(lakhTmpl.totalChitValue).toBe(100000);
    expect(lakhTmpl.requiresMemberConfirmation).toBe(true);
  });

  it('Scheme A: Creates Diwali Weekly Chit and generates 52 weekly installments with 7-day increments', async () => {
    const groupCode = `DW-TEST-${Date.now()}`;
    const startDate = '2026-11-01';

    const res = await request(app.getHttpServer())
      .post('/chit-groups')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        groupCode,
        name: 'Diwali Weekly Test Batch',
        chitType: 'FIXED_INSTALLMENT',
        totalValue: 10400,
        monthlyContribution: 200,
        totalMonths: 52,
        startDate,
        auctionFrequency: 'WEEKLY',
        status: 'ACTIVE',
        notes: '₹200/wk for 52 wks = ₹10,400',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.auctionFrequency).toBe('WEEKLY');
    diwaliGroupId = res.body.id;

    // Fetch details and check 52 installments
    const detailRes = await request(app.getHttpServer())
      .get(`/chit-groups/${diwaliGroupId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.installments.length).toBe(52);

    // Verify weekly 7-day increment
    const inst1 = detailRes.body.installments[0];
    const inst2 = detailRes.body.installments[1];
    expect(Number(inst1.baseAmount)).toBe(200);
    expect(Number(inst2.baseAmount)).toBe(200);

    const diffDays = Math.round(
      (new Date(inst2.dueDate).getTime() - new Date(inst1.dueDate).getTime()) / (1000 * 60 * 60 * 24),
    );
    expect(diffDays).toBe(7);
  });

  it('Schedule Idempotency (Requirement 8): Retrying schedule generation never creates duplicate installments', async () => {
    const res = await request(app.getHttpServer())
      .post(`/chit-groups/${diwaliGroupId}/generate-schedule`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(201);
    expect(res.body.newlyCreatedCount).toBe(0);
    expect(res.body.existingCount).toBe(52);

    const detailRes = await request(app.getHttpServer())
      .get(`/chit-groups/${diwaliGroupId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(detailRes.body.installments.length).toBe(52);
  });

  it('Scheme A: Enrolls member, records partial weekly payment, and tracks balance', async () => {
    // 1. Enroll customer into ticket #1
    const enrollRes = await request(app.getHttpServer())
      .post(`/chit-groups/${diwaliGroupId}/enroll`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId,
        ticketNumber: 1,
        notes: 'Diwali scheme ticket #1',
      });

    expect(enrollRes.status).toBe(201);
    diwaliMembershipId = enrollRes.body.id;

    // 2. Query customer dues for this membership
    const duesRes = await request(app.getHttpServer())
      .get(`/collections/customer/${customerId}/dues?membershipId=${diwaliMembershipId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(duesRes.status).toBe(200);
    expect(duesRes.body.pendingInstallments.length).toBeGreaterThan(0);
    const firstInst = duesRes.body.pendingInstallments[0];
    expect(firstInst.isWeekly).toBe(true);
    expect(firstInst.periodLabel).toBe('Week 1');
    expect(firstInst.dueAmount).toBe(200);

    // 3. Partial payment of ₹100 for Week 1 (due is ₹200)
    const payRes = await request(app.getHttpServer())
      .post('/collections')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId,
        amount: 100,
        paymentMode: 'CASH',
        idempotencyKey: `diwali-part-${Date.now()}`,
        notes: 'Partial payment for Week 1',
        allocations: [
          {
            installmentId: firstInst.installmentId,
            membershipId: diwaliMembershipId,
            allocatedAmount: 100,
          },
        ],
      });

    expect(payRes.status).toBe(201);
    expect(payRes.body.receiptNumber).toMatch(/^REC-/);

    // 4. Verify updated dues shows remaining ₹100
    const updatedDues = await request(app.getHttpServer())
      .get(`/collections/customer/${customerId}/dues?membershipId=${diwaliMembershipId}`)
      .set('Authorization', `Bearer ${authToken}`);

    const remainingInst = updatedDues.body.pendingInstallments.find(
      (i: any) => i.installmentId === firstInst.installmentId,
    );
    expect(remainingInst).toBeDefined();
    expect(remainingInst.dueAmount).toBe(100);
  });

  it('Scheme B: Creates ₹1 Lakh Chit in PLANNED status, requires confirmation to activate', async () => {
    const groupCode = `LK-TEST-${Date.now()}`;

    // Create in PLANNED status (unconfirmed member count and payout rules)
    const res = await request(app.getHttpServer())
      .post('/chit-groups')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        groupCode,
        name: '₹1 Lakh Monthly Chit 2026',
        chitType: 'AUCTION_BASED',
        totalValue: 100000,
        monthlyContribution: 5000,
        totalMonths: 20,
        startDate: '2026-11-01',
        auctionFrequency: 'MONTHLY',
        status: 'PLANNED',
        notes: 'Stated prize ₹1,00,000. Member count pending confirmation.',
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PLANNED');
    lakhGroupId = res.body.id;

    // Attempt to activate without explicit confirmation flag must fail (400)
    const failRes = await request(app.getHttpServer())
      .post(`/chit-groups/${lakhGroupId}/activate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        startDate: '2026-11-01',
        totalMonths: 20,
        confirmActivation: false,
      });

    expect(failRes.status).toBe(400);

    // Explicit confirmation with verified rules
    const actRes = await request(app.getHttpServer())
      .post(`/chit-groups/${lakhGroupId}/activate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        startDate: '2026-11-01',
        totalMonths: 20,
        foremanCommissionRate: 5.0,
        minBidDiscount: 10000,
        maxBidDiscount: 40000,
        payoutRuleNotes: 'Winning bidder receives stated ₹1,00,000 minus winning bid and 5% commission.',
        confirmActivation: true,
      });

    expect(actRes.status).toBe(201);
    expect(actRes.body.status).toBe('ACTIVE');

    // Verify 20 monthly installments of ₹5,000 were generated
    const detailRes = await request(app.getHttpServer())
      .get(`/chit-groups/${lakhGroupId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(detailRes.body.installments.length).toBe(20);
    expect(Number(detailRes.body.installments[0].baseAmount)).toBe(5000);
    expect(Number(detailRes.body.installments[19].baseAmount)).toBe(5000);
  });
});
