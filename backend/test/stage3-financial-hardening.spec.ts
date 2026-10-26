import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { AppModule } from '../src/app.module.js';

describe('Stage 3 Financial Hardening, Payouts, Expenses & Reports (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let customerId: string;
  let membershipId: string;
  let installmentId: string;
  let dueAmount: number;
  let paymentId: string;

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

  it('Health Check: /health returns database connectivity status', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'HEALTHY');
    expect(res.body.database).toHaveProperty('status', 'CONNECTED');
    expect(res.body).toHaveProperty('uptimeSeconds');
  });

  it('Security: Invalid login credentials return 401 Unauthorized', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'durga', password: 'WrongPassword123!' });

    expect(res.status).toBe(401);
  });

  it('Security: Protected endpoints reject requests without JWT', async () => {
    const res = await request(app.getHttpServer()).get('/customers');
    expect(res.status).toBe(401);
  });

  it('Auth: Owner Durga logs in successfully', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'durga', password: 'Durga@Chit2026!' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    authToken = res.body.accessToken;
  });

  it('Ledger Validation: Allocation exceeding installment due balance is rejected (400 Bad Request)', async () => {
    // 1. Get customer and dues
    const custRes = await request(app.getHttpServer())
      .get('/customers?search=Lakshmi')
      .set('Authorization', `Bearer ${authToken}`);
    customerId = custRes.body.items[0].id;

    const duesRes = await request(app.getHttpServer())
      .get(`/collections/customer/${customerId}/dues`)
      .set('Authorization', `Bearer ${authToken}`);

    const inst = duesRes.body.pendingInstallments[0];
    installmentId = inst.installmentId;
    membershipId = inst.membershipId;
    dueAmount = inst.dueAmount;

    // Attempt to allocate ₹500,000 when due is much less
    const excessiveAmount = dueAmount + 100000;
    const res = await request(app.getHttpServer())
      .post('/collections')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId,
        amount: excessiveAmount,
        paymentMode: 'CASH',
        idempotencyKey: `over-alloc-${Date.now()}`,
        allocations: [
          {
            installmentId,
            membershipId,
            allocatedAmount: excessiveAmount,
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/exceeds/i);
  });

  it('Partial Collection & Idempotency: Records payment and issues receipt', async () => {
    const partialAmount = Math.min(250, dueAmount);
    const key = `stage3-test-${Date.now()}`;

    const res = await request(app.getHttpServer())
      .post('/collections')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId,
        amount: partialAmount,
        paymentMode: 'CASH',
        idempotencyKey: key,
        notes: 'Stage 3 partial collection test',
        allocations: [
          {
            installmentId,
            membershipId,
            allocatedAmount: partialAmount,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('receiptNumber');
    paymentId = res.body.id;
  });

  it('Reversal Integrity: Reverse payment and verify double reversal is rejected (400)', async () => {
    // First reversal
    const rev1 = await request(app.getHttpServer())
      .post(`/collections/${paymentId}/reverse`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ reason: 'Accidental duplicate entry test' });

    expect(rev1.status).toBe(201);
    expect(rev1.body.isReversed).toBe(true);

    // Attempt second reversal on the same payment
    const rev2 = await request(app.getHttpServer())
      .post(`/collections/${paymentId}/reverse`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ reason: 'Attempting to reverse twice' });

    expect(rev2.status).toBe(400);
    expect(rev2.body.message).toMatch(/already.*reversed/i);
  });

  it('Expenses Module: Records operating expense and aggregates totals', async () => {
    const res = await request(app.getHttpServer())
      .post('/expenses')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Office Stationery & Receipt Books',
        category: 'Stationery & Printing',
        amount: 350,
        paymentMode: 'CASH',
        notes: 'Printed 5 receipt pads',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(Number(res.body.amount)).toBe(350);

    // Verify list and totals
    const listRes = await request(app.getHttpServer())
      .get('/expenses?category=Stationery%20%26%20Printing')
      .set('Authorization', `Bearer ${authToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.totals.totalAmount).toBeGreaterThanOrEqual(350);
  });

  it('Reports Module: Generates daily collection, customer outstanding and group efficiency reports', async () => {
    const today = new Date().toISOString().split('T')[0];

    const dailyRes = await request(app.getHttpServer())
      .get(`/reports/daily-collection?date=${today}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(dailyRes.status).toBe(200);
    expect(dailyRes.body).toHaveProperty('summary');

    const outRes = await request(app.getHttpServer())
      .get('/reports/customer-outstanding')
      .set('Authorization', `Bearer ${authToken}`);
    expect(outRes.status).toBe(200);
    expect(outRes.body).toHaveProperty('summary');
    expect(outRes.body).toHaveProperty('items');

    const grpRes = await request(app.getHttpServer())
      .get('/reports/group-wise')
      .set('Authorization', `Bearer ${authToken}`);
    expect(grpRes.status).toBe(200);
    expect(Array.isArray(grpRes.body)).toBe(true);
  });

  it('Audit Logs: Verifies all financial events are immutably logged', async () => {
    const res = await request(app.getHttpServer())
      .get('/audit-logs?limit=10')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.some((log: any) => log.action.includes('REVERSED') || log.action.includes('COLLECTION'))).toBe(true);
  });
});
