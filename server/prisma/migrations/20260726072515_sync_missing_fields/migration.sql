-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_residentId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_staffId_fkey";

-- AlterTable
ALTER TABLE "dining_reservations" ADD COLUMN     "tableId" TEXT;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "endTime" TEXT;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "residentId" TEXT,
ADD COLUMN     "staffId" TEXT;

-- AlterTable
ALTER TABLE "residents" ADD COLUMN     "avatarStyle" TEXT,
ADD COLUMN     "emergency2Name" TEXT,
ADD COLUMN     "emergency2Phone" TEXT,
ADD COLUMN     "emergency2Relation" TEXT,
ADD COLUMN     "noticesLastSeenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "maxPartySize" INTEGER NOT NULL DEFAULT 8;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "emailTokenHash" TEXT,
ADD COLUMN     "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pendingEmail" TEXT,
ADD COLUMN     "resetTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "resetTokenHash" TEXT,
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "auth_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_action_events" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "actorRole" "PortalRole" NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_action_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_events_userId_idx" ON "auth_events"("userId");

-- CreateIndex
CREATE INDEX "auth_events_type_idx" ON "auth_events"("type");

-- CreateIndex
CREATE INDEX "auth_events_createdAt_idx" ON "auth_events"("createdAt");

-- CreateIndex
CREATE INDEX "admin_action_events_resourceType_resourceId_idx" ON "admin_action_events"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "admin_action_events_actorUserId_idx" ON "admin_action_events"("actorUserId");

-- CreateIndex
CREATE INDEX "admin_action_events_createdAt_idx" ON "admin_action_events"("createdAt");

-- CreateIndex
CREATE INDEX "bookings_facilityId_date_status_idx" ON "bookings"("facilityId", "date", "status");

-- CreateIndex
CREATE INDEX "dining_tables_restaurantId_status_idx" ON "dining_tables"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "notifications_residentId_idx" ON "notifications"("residentId");

-- CreateIndex
CREATE INDEX "notifications_staffId_idx" ON "notifications"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "users_resetTokenHash_key" ON "users"("resetTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "users_pendingEmail_key" ON "users"("pendingEmail");

-- CreateIndex
CREATE UNIQUE INDEX "users_emailTokenHash_key" ON "users"("emailTokenHash");

-- AddForeignKey
ALTER TABLE "dining_reservations" ADD CONSTRAINT "dining_reservations_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "dining_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

