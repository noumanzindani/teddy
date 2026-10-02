-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "addOns" JSONB DEFAULT '[]';

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "directBookingSlug" TEXT,
ADD COLUMN     "requiresCardOnFile" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "canBookOnline" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "allowTips" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bookingWindowDays" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "cancellationHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "cardFeePercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "memberBookingWindowDays" INTEGER,
ADD COLUMN     "rescheduleHours" INTEGER NOT NULL DEFAULT 24;

-- CreateTable
CREATE TABLE "ServiceAddOn" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "durationMin" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceAddOn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceAddOn_serviceId_idx" ON "ServiceAddOn"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Service_directBookingSlug_key" ON "Service"("directBookingSlug");

-- AddForeignKey
ALTER TABLE "ServiceAddOn" ADD CONSTRAINT "ServiceAddOn_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

