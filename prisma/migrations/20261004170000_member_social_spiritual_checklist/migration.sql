-- AlterTable
ALTER TABLE "served_members" ADD COLUMN "facebookUrl" TEXT,
ADD COLUMN "instagramUrl" TEXT;

-- CreateTable
CREATE TABLE "spiritual_checklist_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spiritual_checklist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "spiritual_checklist_entries_userId_periodKey_idx" ON "spiritual_checklist_entries"("userId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "spiritual_checklist_entries_userId_itemKey_periodKey_key" ON "spiritual_checklist_entries"("userId", "itemKey", "periodKey");

-- AddForeignKey
ALTER TABLE "spiritual_checklist_entries" ADD CONSTRAINT "spiritual_checklist_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
