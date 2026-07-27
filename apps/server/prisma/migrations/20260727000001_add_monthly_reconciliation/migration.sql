-- CreateEnum
CREATE TYPE "reconciliation_status_enum" AS ENUM ('pending', 'confirmed', 'disputed');

-- CreateTable
CREATE TABLE "monthly_reconciliations" (
    "id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "period" VARCHAR(7) NOT NULL,
    "opening_balance" INTEGER NOT NULL,
    "total_recharge" INTEGER NOT NULL DEFAULT 0,
    "total_spent" INTEGER NOT NULL DEFAULT 0,
    "total_refund" INTEGER NOT NULL DEFAULT 0,
    "closing_balance" INTEGER NOT NULL,
    "expected_close" INTEGER NOT NULL,
    "has_difference" BOOLEAN NOT NULL DEFAULT false,
    "status" "reconciliation_status_enum" NOT NULL DEFAULT 'pending',
    "confirmed_by" UUID,
    "confirmed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "monthly_reconciliations_store_id_period_key" ON "monthly_reconciliations"("store_id", "period");

-- AddForeignKey
ALTER TABLE "monthly_reconciliations" ADD CONSTRAINT "monthly_reconciliations_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_reconciliations" ADD CONSTRAINT "monthly_reconciliations_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_reconciliations" ADD CONSTRAINT "monthly_reconciliations_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
