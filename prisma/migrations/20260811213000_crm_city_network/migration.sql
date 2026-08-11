-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('CUSTOMER', 'PARTNER', 'SUPPLIER', 'REFERRAL', 'TEAM', 'OTHER');

-- CreateTable
CREATE TABLE "Company" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "document" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "description" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Brasil',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Client"
ADD COLUMN "companyId" UUID,
ADD COLUMN "photoUrl" TEXT,
ADD COLUMN "jobTitle" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "state" TEXT,
ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "ClientRelationship" (
    "id" UUID NOT NULL,
    "sourceClientId" UUID NOT NULL,
    "targetClientId" UUID NOT NULL,
    "type" "RelationshipType" NOT NULL DEFAULT 'OTHER',
    "label" TEXT,
    "strength" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");
CREATE INDEX "Company_active_name_idx" ON "Company"("active", "name");
CREATE INDEX "Company_city_state_idx" ON "Company"("city", "state");
CREATE INDEX "Client_companyId_active_idx" ON "Client"("companyId", "active");
CREATE UNIQUE INDEX "ClientRelationship_sourceClientId_targetClientId_type_key" ON "ClientRelationship"("sourceClientId", "targetClientId", "type");
CREATE INDEX "ClientRelationship_sourceClientId_active_idx" ON "ClientRelationship"("sourceClientId", "active");
CREATE INDEX "ClientRelationship_targetClientId_active_idx" ON "ClientRelationship"("targetClientId", "active");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClientRelationship" ADD CONSTRAINT "ClientRelationship_sourceClientId_fkey" FOREIGN KEY ("sourceClientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientRelationship" ADD CONSTRAINT "ClientRelationship_targetClientId_fkey" FOREIGN KEY ("targetClientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
