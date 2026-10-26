-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('NOT_CONFIGURED', 'NO_COMMISSION', 'PERCENTAGE_OF_CHIT_VALUE', 'PERCENTAGE_OF_EACH_COLLECTION', 'FIXED_AMOUNT_PER_INSTALLMENT', 'FIXED_AMOUNT_PER_CHIT_GROUP', 'AUCTION_BASED_EARNINGS', 'CUSTOM_OTHER');

-- AlterTable
ALTER TABLE "chit_groups" ADD COLUMN     "commission_amount" DECIMAL(12,2),
ADD COLUMN     "commission_calculation_base" TEXT,
ADD COLUMN     "commission_notes" TEXT,
ADD COLUMN     "commission_rate" DECIMAL(5,2),
ADD COLUMN     "commission_type" "CommissionType" NOT NULL DEFAULT 'PERCENTAGE_OF_CHIT_VALUE',
ADD COLUMN     "is_commission_confirmed" BOOLEAN NOT NULL DEFAULT false;
