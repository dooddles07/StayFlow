-- CreateIndex
CREATE INDEX "family_members_residentId_idx" ON "family_members"("residentId");

-- CreateIndex
CREATE INDEX "vehicles_residentId_idx" ON "vehicles"("residentId");

-- CreateIndex
CREATE INDEX "bookings_residentId_idx" ON "bookings"("residentId");

-- CreateIndex
CREATE INDEX "dining_reservations_restaurantId_idx" ON "dining_reservations"("restaurantId");

-- CreateIndex
CREATE INDEX "dining_reservations_residentId_idx" ON "dining_reservations"("residentId");

-- CreateIndex
CREATE INDEX "dining_reservations_tableId_idx" ON "dining_reservations"("tableId");

-- CreateIndex
CREATE INDEX "guests_hostResidentId_idx" ON "guests"("hostResidentId");
