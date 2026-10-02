-- AlterTable
ALTER TABLE "StaffMember" ADD COLUMN IF NOT EXISTS "permissions" JSONB NOT NULL DEFAULT '{"scheduleClients":true,"rescheduleClients":true,"moveAppointments":true,"manageGiftCards":true,"manageWorkingHours":true,"requestTimeOff":true,"createForms":true,"sendForms":true,"manageMemberships":true,"manageProducts":true,"manageWaitlist":true}';

