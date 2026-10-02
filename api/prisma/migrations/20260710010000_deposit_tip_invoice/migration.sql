-- AlterTable: Service — deposit percentage charged up front
ALTER TABLE "Service" ADD COLUMN     "depositPercentage" INTEGER NOT NULL DEFAULT 100;

-- AlterTable: Booking — deposit / balance / tip
ALTER TABLE "Booking" ADD COLUMN     "depositAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "balanceAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tipAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "balancePaidAt" TIMESTAMP(3);

-- CreateTable: Invoice
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "staffMemberId" TEXT,
    "serviceName" TEXT NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "extraTimeCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "depositPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "balancePaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tip" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_bookingId_key" ON "Invoice"("bookingId");
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");
CREATE INDEX "Invoice_vendorId_idx" ON "Invoice"("vendorId");
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");
CREATE INDEX "Invoice_staffMemberId_idx" ON "Invoice"("staffMemberId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
