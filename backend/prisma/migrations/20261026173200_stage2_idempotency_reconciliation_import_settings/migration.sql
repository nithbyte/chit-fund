-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "idempotency_key" TEXT;

-- CreateTable
CREATE TABLE "daily_reconciliations" (
    "id" UUID NOT NULL,
    "reconciliation_date" TIMESTAMP(3) NOT NULL,
    "system_cash_total" DECIMAL(12,2) NOT NULL,
    "system_upi_total" DECIMAL(12,2) NOT NULL,
    "system_bank_total" DECIMAL(12,2) NOT NULL,
    "system_total" DECIMAL(12,2) NOT NULL,
    "actual_cash_counted" DECIMAL(12,2),
    "actual_upi_verified" DECIMAL(12,2),
    "actual_bank_verified" DECIMAL(12,2),
    "discrepancy_note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "reconciled_by_id" UUID,
    "reconciled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" UUID NOT NULL,
    "batch_type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "file_content" TEXT NOT NULL,
    "total_rows" INTEGER NOT NULL,
    "success_rows" INTEGER NOT NULL,
    "failed_rows" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "summary" JSONB,
    "imported_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_reconciliations_reconciliation_date_key" ON "daily_reconciliations"("reconciliation_date");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- AddForeignKey
ALTER TABLE "daily_reconciliations" ADD CONSTRAINT "daily_reconciliations_reconciled_by_id_fkey" FOREIGN KEY ("reconciled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_imported_by_id_fkey" FOREIGN KEY ("imported_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
