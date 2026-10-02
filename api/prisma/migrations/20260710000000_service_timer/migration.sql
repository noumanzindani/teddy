-- AlterTable: Service — timed-service flag + extra-time pricing
ALTER TABLE "Service" ADD COLUMN     "isTimed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "extraTimeRate" DECIMAL(10,2);

-- AlterTable: Booking — on-site service timer fields
ALTER TABLE "Booking" ADD COLUMN     "timerStartedAt" TIMESTAMP(3),
ADD COLUMN     "timerDurationMin" INTEGER,
ADD COLUMN     "timerExtraMin" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "timerExtraCost" DECIMAL(10,2) NOT NULL DEFAULT 0;
