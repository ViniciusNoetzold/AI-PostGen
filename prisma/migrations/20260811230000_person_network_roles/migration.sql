-- CreateEnum
CREATE TYPE "PersonCategory" AS ENUM ('OWNER', 'COFOUNDER', 'EMPLOYEE', 'CUSTOMER', 'LEAD', 'PARTNER', 'OTHER');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "category" "PersonCategory" NOT NULL DEFAULT 'OTHER';

-- CreateIndex
CREATE INDEX "Client_category_active_idx" ON "Client"("category", "active");
