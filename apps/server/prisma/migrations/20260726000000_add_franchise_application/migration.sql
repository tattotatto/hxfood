-- CreateEnum
CREATE TYPE "franchise_app_status_enum" AS ENUM ('submitted', 'under_review', 'approved', 'payment_confirmed', 'activated', 'rejected', 'cancelled');

-- CreateTable
CREATE TABLE "franchise_applications" (
    "id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "applicant_name" VARCHAR(50) NOT NULL,
    "applicant_phone" VARCHAR(20) NOT NULL,
    "applicant_openid" VARCHAR(64),
    "store_name" VARCHAR(200) NOT NULL,
    "city" VARCHAR(50) NOT NULL,
    "address" VARCHAR(300) NOT NULL,
    "investment_budget" DECIMAL(12,2),
    "status" "franchise_app_status_enum" NOT NULL DEFAULT 'submitted',
    "reviewer_id" UUID,
    "review_comment" TEXT,
    "reviewed_at" TIMESTAMPTZ,
    "payment_confirmed_by" UUID,
    "payment_confirmed_at" TIMESTAMPTZ,
    "payment_remark" TEXT,
    "activated_at" TIMESTAMPTZ,
    "created_org_id" UUID,
    "remark" TEXT,
    "documents" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "franchise_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "franchise_applications_brand_id_status_created_at_idx" ON "franchise_applications"("brand_id", "status", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "franchise_applications" ADD CONSTRAINT "franchise_applications_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "franchise_applications" ADD CONSTRAINT "franchise_applications_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "franchise_applications" ADD CONSTRAINT "franchise_applications_payment_confirmed_by_fkey" FOREIGN KEY ("payment_confirmed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
