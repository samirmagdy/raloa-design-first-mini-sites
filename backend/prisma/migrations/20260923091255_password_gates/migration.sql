-- AlterTable
ALTER TABLE "Block" ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "passwordProtected" BOOLEAN NOT NULL DEFAULT false;
