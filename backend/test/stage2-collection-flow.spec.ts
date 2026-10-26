import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { AppModule } from '../src/app.module.js';

describe('Stage 2 Complete Collection & Ledger Flow (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let customerId: string;
  let installmentId: string;
  let membershipId: string;
  let initialDue: number;
  let paymentId: string;
  const idempotencyKey = `e2e-test-${Date.now()}`;

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

  it('Step 1: Authenticate owner Durga and obtain JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'durga', password: 'Durga@Chit2026!' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    authToken = res.body.accessToken;
  });

  it('Step 2: Search customer directory and verify server-side search', async () => {
    const res = await request(app.getHttpServer())
      .get('/customers?search=Ramesh')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items.length).toBeGreaterThan(0);
    customerId = res.body.items[0].id;
    expect(res.body.items[0].customerCode).toBeDefined();
  });

  it('Step 3: Test duplicate customer detection without hard crash', async () => {
    const res = await request(app.getHttpServer())
      .get('/customers/check-duplicate?phone=9848011223&name=Ramesh')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('hasMatches');
    expect(res.body.hasMatches).toBe(true);
    expect(res.body.matchingPhone.length).toBeGreaterThan(0);
  });

  it('Step 4: Fetch customer dues and snapshot pending installments', async () => {
    const res = await request(app.getHttpServer())
      .get(`/collections/customer/${customerId}/dues`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('pendingInstallments');
    expect(res.body.pendingInstallments.length).toBeGreaterThan(0);

    const firstInst = res.body.pendingInstallments[0];
    installmentId = firstInst.installmentId;
    membershipId = firstInst.membershipId;
    initialDue = firstInst.dueAmount;
    expect(initialDue).toBeGreaterThan(0);
  });

  it('Step 5: Record payment with idempotency key and atomic allocation', async () => {
    const collectionAmount = Math.min(1000, initialDue);

    const payload = {
      customerId,
      amount: collectionAmount,
      paymentMode: 'UPI',
      transactionRef: 'UPI-TEST-98480',
      notes: 'End-to-end integration test collection',
      idempotencyKey,
      allocations: [
        {
          installmentId,
          membershipId,
          allocatedAmount: collectionAmount,
        },
      ],
    };

    const res = await request(app.getHttpServer())
      .post('/collections')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('receiptNumber');
    expect(res.body.receiptNumber).toMatch(/^REC-/);
    expect(Number(res.body.amount)).toBe(collectionAmount);
    paymentId = res.body.id;

    // Test Idempotency: Repeating exact request with same idempotency key must return same receipt
    const duplicateRes = await request(app.getHttpServer())
      .post('/collections')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload);

    expect(duplicateRes.status).toBe(201);
    expect(duplicateRes.body.id).toBe(paymentId);
    expect(duplicateRes.body.receiptNumber).toBe(res.body.receiptNumber);
  });

  it('Step 6: Verify updated customer dues decreased by exact allocated amount', async () => {
    const res = await request(app.getHttpServer())
      .get(`/collections/customer/${customerId}/dues`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    const updatedInst = res.body.pendingInstallments.find((i: any) => i.installmentId === installmentId);
    const remaining = updatedInst ? updatedInst.dueAmount : 0;
    const collectionAmount = Math.min(1000, initialDue);

    expect(Math.abs(remaining - (initialDue - collectionAmount))).toBeLessThan(0.01);
  });

  it('Step 7: Verify Daily Reconciliation reflects the new collection', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await request(app.getHttpServer())
      .get(`/reconciliation/daily?date=${today}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.systemTotals.systemUpiTotal).toBeGreaterThanOrEqual(1000);
    expect(res.body.transactions.some((t: any) => t.id === paymentId)).toBe(true);
  });

  it('Step 8: Perform non-destructive payment reversal and restore balances', async () => {
    const res = await request(app.getHttpServer())
      .post(`/collections/${paymentId}/reverse`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ reason: 'E2E automated test reversal verification' });

    expect(res.status).toBe(201);
    expect(res.body.isReversed).toBe(true);
    expect(res.body.reversalReason).toBe('E2E automated test reversal verification');

    // Verify balance is restored
    const duesRes = await request(app.getHttpServer())
      .get(`/collections/customer/${customerId}/dues`)
      .set('Authorization', `Bearer ${authToken}`);

    const restoredInst = duesRes.body.pendingInstallments.find((i: any) => i.installmentId === installmentId);
    expect(restoredInst).toBeDefined();
    expect(Math.abs(restoredInst.dueAmount - initialDue)).toBeLessThan(0.01);
  });
});
