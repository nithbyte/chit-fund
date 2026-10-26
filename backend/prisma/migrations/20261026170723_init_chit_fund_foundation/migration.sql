-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ChitType" AS ENUM ('AUCTION_BASED', 'FIXED_INSTALLMENT');

-- CreateEnum
CREATE TYPE "ChitGroupStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'SURRENDERED', 'DEFAULTED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('COMPLETED', 'REVERSED', 'PENDING');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING_APPROVAL', 'DISBURSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OWNER',
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "customer_code" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "alternate_phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "identity_proof_type" TEXT,
    "identity_proof_number" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chit_groups" (
    "id" UUID NOT NULL,
    "group_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chit_type" "ChitType" NOT NULL DEFAULT 'AUCTION_BASED',
    "total_value" DECIMAL(12,2) NOT NULL,
    "monthly_contribution" DECIMAL(12,2) NOT NULL,
    "total_months" INTEGER NOT NULL,
    "current_month" INTEGER NOT NULL DEFAULT 1,
    "start_date" TIMESTAMP(3) NOT NULL,
    "expected_end_date" TIMESTAMP(3) NOT NULL,
    "foreman_commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "min_bid_discount" DECIMAL(12,2),
    "max_bid_discount" DECIMAL(12,2),
    "auction_frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "auction_day_of_month" INTEGER,
    "status" "ChitGroupStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chit_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "chit_group_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "ticket_number" INTEGER NOT NULL,
    "joined_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_prized" BOOLEAN NOT NULL DEFAULT false,
    "prized_month" INTEGER,
    "prize_amount" DECIMAL(12,2),
    "nominee_name" TEXT,
    "nominee_phone" TEXT,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installments" (
    "id" UUID NOT NULL,
    "chit_group_id" UUID NOT NULL,
    "month_number" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "base_amount" DECIMAL(12,2) NOT NULL,
    "dividend_per_ticket" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "payable_amount" DECIMAL(12,2) NOT NULL,
    "auction_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "payment_mode" "PaymentMode" NOT NULL DEFAULT 'CASH',
    "transaction_ref" TEXT,
    "notes" TEXT,
    "received_by_id" UUID NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "is_reversed" BOOLEAN NOT NULL DEFAULT false,
    "reversal_reason" TEXT,
    "reversed_at" TIMESTAMP(3),
    "reversed_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_allocations" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "installment_id" UUID NOT NULL,
    "allocated_amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auctions" (
    "id" UUID NOT NULL,
    "chit_group_id" UUID NOT NULL,
    "month_number" INTEGER NOT NULL,
    "auction_date" TIMESTAMP(3) NOT NULL,
    "winning_bid_amount" DECIMAL(12,2) NOT NULL,
    "foreman_commission" DECIMAL(12,2) NOT NULL,
    "dividend_total" DECIMAL(12,2) NOT NULL,
    "dividend_per_member" DECIMAL(12,2) NOT NULL,
    "winning_membership_id" UUID,
    "net_prize_amount" DECIMAL(12,2) NOT NULL,
    "status" "AuctionStatus" NOT NULL DEFAULT 'COMPLETED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" UUID NOT NULL,
    "chit_group_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "auction_id" UUID NOT NULL,
    "voucher_number" TEXT NOT NULL,
    "gross_prize_amount" DECIMAL(12,2) NOT NULL,
    "deduction_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "net_paid_amount" DECIMAL(12,2) NOT NULL,
    "payout_date" TIMESTAMP(3) NOT NULL,
    "payment_mode" "PaymentMode" NOT NULL DEFAULT 'BANK_TRANSFER',
    "transaction_ref" TEXT,
    "guarantor_name_1" TEXT,
    "guarantor_phone_1" TEXT,
    "guarantor_name_2" TEXT,
    "guarantor_phone_2" TEXT,
    "status" "PayoutStatus" NOT NULL DEFAULT 'DISBURSED',
    "disbursed_by_id" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "expense_date" TIMESTAMP(3) NOT NULL,
    "payment_mode" "PaymentMode" NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "notes" TEXT,
    "recorded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by_id" UUID NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "customers_customer_code_key" ON "customers"("customer_code");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_full_name_idx" ON "customers"("full_name");

-- CreateIndex
CREATE UNIQUE INDEX "chit_groups_group_code_key" ON "chit_groups"("group_code");

-- CreateIndex
CREATE INDEX "chit_groups_status_idx" ON "chit_groups"("status");

-- CreateIndex
CREATE INDEX "memberships_customer_id_idx" ON "memberships"("customer_id");

-- CreateIndex
CREATE INDEX "memberships_chit_group_id_idx" ON "memberships"("chit_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_chit_group_id_ticket_number_key" ON "memberships"("chit_group_id", "ticket_number");

-- CreateIndex
CREATE INDEX "installments_due_date_idx" ON "installments"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "installments_chit_group_id_month_number_key" ON "installments"("chit_group_id", "month_number");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receipt_number_key" ON "payments"("receipt_number");

-- CreateIndex
CREATE INDEX "payments_customer_id_idx" ON "payments"("customer_id");

-- CreateIndex
CREATE INDEX "payments_payment_date_idx" ON "payments"("payment_date");

-- CreateIndex
CREATE INDEX "payments_receipt_number_idx" ON "payments"("receipt_number");

-- CreateIndex
CREATE INDEX "payment_allocations_membership_id_idx" ON "payment_allocations"("membership_id");

-- CreateIndex
CREATE INDEX "payment_allocations_installment_id_idx" ON "payment_allocations"("installment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_allocations_payment_id_installment_id_membership_id_key" ON "payment_allocations"("payment_id", "installment_id", "membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "auctions_chit_group_id_month_number_key" ON "auctions"("chit_group_id", "month_number");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_voucher_number_key" ON "payouts"("voucher_number");

-- CreateIndex
CREATE INDEX "payouts_membership_id_idx" ON "payouts"("membership_id");

-- CreateIndex
CREATE INDEX "payouts_payout_date_idx" ON "payouts"("payout_date");

-- CreateIndex
CREATE INDEX "expenses_expense_date_idx" ON "expenses"("expense_date");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_chit_group_id_fkey" FOREIGN KEY ("chit_group_id") REFERENCES "chit_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installments" ADD CONSTRAINT "installments_chit_group_id_fkey" FOREIGN KEY ("chit_group_id") REFERENCES "chit_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installments" ADD CONSTRAINT "installments_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_installment_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "installments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_chit_group_id_fkey" FOREIGN KEY ("chit_group_id") REFERENCES "chit_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_winning_membership_id_fkey" FOREIGN KEY ("winning_membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_chit_group_id_fkey" FOREIGN KEY ("chit_group_id") REFERENCES "chit_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_disbursed_by_id_fkey" FOREIGN KEY ("disbursed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
