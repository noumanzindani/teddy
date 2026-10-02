-- AlterTable
ALTER TABLE "MembershipPlan" ADD COLUMN     "eligibleServiceIds" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "ServiceProduct" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'use';

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "smsConfig" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "PreferenceQuestion" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'text',
    "options" JSONB NOT NULL DEFAULT '[]',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "appliesToServiceIds" JSONB NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreferenceQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreferenceAnswer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreferenceAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeGoal" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "label" TEXT,
    "target" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL DEFAULT 'monthly',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkincareRoutine" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "createdById" TEXT,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "sentToClient" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkincareRoutine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffTask" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "staffMemberId" TEXT,
    "assignedById" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "dueAt" TIMESTAMP(3),
    "recurring" TEXT,
    "isPersonal" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffNote" (
    "id" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffCheckIn" (
    "id" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "mood" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PreferenceQuestion_vendorId_idx" ON "PreferenceQuestion"("vendorId");

-- CreateIndex
CREATE INDEX "PreferenceAnswer_clientId_idx" ON "PreferenceAnswer"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "PreferenceAnswer_questionId_clientId_key" ON "PreferenceAnswer"("questionId", "clientId");

-- CreateIndex
CREATE INDEX "EmployeeGoal_vendorId_idx" ON "EmployeeGoal"("vendorId");

-- CreateIndex
CREATE INDEX "EmployeeGoal_staffMemberId_idx" ON "EmployeeGoal"("staffMemberId");

-- CreateIndex
CREATE INDEX "SkincareRoutine_clientId_idx" ON "SkincareRoutine"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "SkincareRoutine_clientId_vendorId_key" ON "SkincareRoutine"("clientId", "vendorId");

-- CreateIndex
CREATE INDEX "StaffTask_vendorId_idx" ON "StaffTask"("vendorId");

-- CreateIndex
CREATE INDEX "StaffTask_staffMemberId_idx" ON "StaffTask"("staffMemberId");

-- CreateIndex
CREATE INDEX "StaffNote_staffMemberId_idx" ON "StaffNote"("staffMemberId");

-- CreateIndex
CREATE INDEX "StaffCheckIn_staffMemberId_idx" ON "StaffCheckIn"("staffMemberId");

