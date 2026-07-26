-- CreateEnum
CREATE TYPE "shipment_status_enum" AS ENUM ('pending', 'shipped', 'partially_received', 'received', 'cancelled');

-- CreateTable
CREATE TABLE "shipments" (
    "id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "shipment_no" VARCHAR(32) NOT NULL,
    "order_id" UUID NOT NULL,
    "from_warehouse_id" UUID NOT NULL,
    "to_store_id" UUID NOT NULL,
    "status" "shipment_status_enum" NOT NULL DEFAULT 'pending',
    "carrier" VARCHAR(100),
    "tracking_no" VARCHAR(100),
    "shipped_at" TIMESTAMPTZ,
    "received_at" TIMESTAMPTZ,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipments_shipment_no_key" ON "shipments"("shipment_no");

-- CreateIndex
CREATE INDEX "shipments_order_id_idx" ON "shipments"("order_id");

-- CreateIndex
CREATE INDEX "shipments_brand_id_status_created_at_idx" ON "shipments"("brand_id", "status", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_from_warehouse_id_fkey" FOREIGN KEY ("from_warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_to_store_id_fkey" FOREIGN KEY ("to_store_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_transit_inventory" ADD CONSTRAINT "in_transit_inventory_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
