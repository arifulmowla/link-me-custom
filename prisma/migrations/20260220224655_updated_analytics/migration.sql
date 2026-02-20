-- AlterTable
ALTER TABLE "LinkClick" ADD COLUMN     "city" TEXT,
ADD COLUMN     "deviceType" TEXT,
ADD COLUMN     "region" TEXT;

-- CreateIndex
CREATE INDEX "LinkClick_country_region_idx" ON "LinkClick"("country", "region");

-- CreateIndex
CREATE INDEX "LinkClick_deviceType_idx" ON "LinkClick"("deviceType");
