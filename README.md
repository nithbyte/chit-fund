# Durga Chit Fund Management System

A production-quality collection and ledger management system designed for a small chit company operated by a single owner, **Durga**.

Designed mobile-first (360–430px) for phone usage during collection rounds, with desktop dashboard responsiveness.

---

## 1. System Overview & Technology Stack

### Frontend
- **Framework**: React 19 with TypeScript & Vite
- **Styling**: Tailwind CSS (clean navy / slate / teal palette, touch targets ≥ 44px, safe area insets)
- **Routing**: React Router v7 with protected session guard
- **Server State**: TanStack Query v5 with automatic background refresh
- **Form Validation**: React Hook Form + Zod
- **Icons**: Lucide React
- **Currency & Timezone**: INR (₹) formatted via Indian numbering system (`en-IN`), Asia/Kolkata timezone

### Backend
- **Framework**: NestJS 12 with TypeScript (ESM / NodeNext)
- **Database ORM**: Prisma 6 ORM
- **Database**: PostgreSQL (UUID primary keys, Decimal numeric money types, foreign key constraints, indexes)
- **Security & Auth**: Argon2id password hashing (`@node-rs/argon2`), JWT Bearer tokens, Helmet security headers, CORS protection
- **Rate Limiting**: `@nestjs/throttler` (protects login and sensitive financial endpoints)
- **Validation**: Global `ValidationPipe` with `class-validator` & `class-transformer`
- **Documentation**: Swagger / OpenAPI documentation at `/api/docs`

---

## 2. Implemented Features (Stage 1 Foundation)

1. **Owner Authentication & Security**:
   - Secure login using **Argon2id** password hashing.
   - Session verification and profile retrieval (`/api/auth/me`).
   - Rate limiting on login attempts to mitigate brute-force attacks.

2. **Customer Directory (Notebook & Excel Migration)**:
   - Supports 50–200 customer records.
   - Unique auto-incrementing customer codes (`CUST-001`, `CUST-002`, etc.).
   - Instant search by full name, phone number, or code.
   - Dues calculation across all active chit groups per customer.
   - Add and edit customer details with Indian mobile phone validation (`/^[6-9]\d{9}$/`).

3. **Chit Schemes & Groups**:
   - Supports both **Auction-Based** and **Fixed-Installment** chit groups.
   - Scheme terms preservation: duration, total pool value, monthly contribution, foreman commission rate (default 5.0%), minimum and maximum bid discount ceilings.
   - Automatic installment schedule generation (Month 1 through Month N) on creation.
   - Ticket enrollment mechanism verifying slot bounds and preventing duplicate allocations.

4. **Collections & Payment Ledger**:
   - **Manual Collection Entry**: Designed for collections received in Cash, UPI, or Bank Transfer.
   - **Separation of Payments & Allocations**: Payments are stored distinctly from installments.
   - **Multi-Installment & Partial Payments**: A single payment can cover multiple installments or partial installments.
   - **Non-Destructive Reversals**: Receipts cannot be silently deleted; mistaken receipts can be reversed with a mandatory reason, updating the status and creating an audit trail.
   - **Official Printable Receipts**: Printable receipt view with itemized allocation breakdown and proprietor authorization stamp.

5. **Auctions & Dividend Calculation**:
   - Record monthly auction results with winning bid discount.
   - Automatic backend computation of 5% foreman commission, total dividend, and per-member dividend pass-through.
   - Automatic adjustment of the corresponding installment's net payable amount (`baseAmount - dividendPerTicket`).
   - Winning member ticket marked as prized with prize payout recorded.

6. **Executive Dashboard**:
   - Real-time KPIs: Today's collections, this month's collections, total outstanding dues across all groups, foreman commission earned to date.
   - Operational counts: active customers and active chit batches.
   - Recent collections feed with one-click receipt links.

---

## 3. Database Schema

Managed via Prisma in `backend/prisma/schema.prisma`:
- `users`: Owner account (Durga) with Argon2id hash and role-based access.
- `customers`: Customer records, identity proof, contact details, notebook notes.
- `chit_groups`: Schemes, terms, commission rates, and lifecycle status.
- `memberships`: Customer ticket enrollment in chit groups.
- `installments`: Month-by-month payment schedule, dividends, and payable amounts.
- `payments`: Manual collection receipts, modes (CASH/UPI/BANK_TRANSFER), and reversal metadata.
- `payment_allocations`: Join records mapping a payment to specific installment(s) and membership(s).
- `auctions`: Monthly auction results, winning bids, and calculated foreman commissions.
- `payouts`: Prize disbursements, voucher numbers, and guarantor records.
- `expenses`: Internal company expenses.
- `audit_logs`: Append-only audit trail tracking sensitive modifications.

---

## 4. Environment Variables

### Backend (`backend/.env`)
Create a `.env` file in the `backend/` directory (an example is provided in `backend/.env.example`):

```env
PORT=4000
NODE_ENV=development
API_PREFIX=api

# PostgreSQL Connection String
DATABASE_URL="postgresql://postgres:root@localhost:5432/durga_chit_fund_dev?schema=public"

# Authentication
JWT_SECRET="durga_chit_fund_dev_jwt_secret_key_2026_safe_min_32_characters"
JWT_EXPIRES_IN="7d"

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=60

# Frontend Origin for CORS
CORS_ORIGIN="http://localhost:5173"
```

---

## 5. Quick Start Instructions

### 1. Database Setup & Migration
Ensure PostgreSQL is running, then run the migration and seed:

```bash
# In backend directory
cd backend
npx prisma migrate dev
npm run seed
```

### 2. Start the Backend API
```bash
# In backend directory
npm run start:dev
```
- API will be accessible at: `http://localhost:4000/api`
- Swagger OpenAPI documentation at: `http://localhost:4000/api/docs`

### 3. Start the Frontend Application
```bash
# In frontend directory
cd frontend
npm run dev
```
- Web application will be accessible at: `http://localhost:5173`

---

## 6. Default Owner Credentials

- **Username**: `durga`
- **Password**: `Durga@Chit2026!`

---

## 7. Automated Testing & Quality Checks

Run the automated test suites:

```bash
# Backend unit & integration tests
npm run test:backend

# Type-check and build backend
npm run build:backend

# Type-check and build frontend
npm run build:frontend

# Linter checks (oxlint)
npm run lint
```
