-- CreateEnum
CREATE TYPE "AuctionCalculationMode" AS ENUM ('DISCOUNT_BASED', 'FIXED_PAYOUT');

-- AlterTable
ALTER TABLE "auctions" ADD COLUMN     "adjustment_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "auction_calculation_mode" "AuctionCalculationMode" NOT NULL DEFAULT 'DISCOUNT_BASED',
ADD COLUMN     "fixed_payout_amount" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "chit_groups" ADD COLUMN     "auction_calculation_mode" "AuctionCalculationMode" NOT NULL DEFAULT 'DISCOUNT_BASED',
ADD COLUMN     "fixed_payout_adjustments" DECIMAL(12,2) DEFAULT 0.00,
ADD COLUMN     "fixed_payout_amount" DECIMAL(12,2);
