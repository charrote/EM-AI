-- AlterTable
ALTER TABLE "device_types" ADD COLUMN "documents" JSONB;

-- AlterTable
ALTER TABLE "devices" ADD COLUMN "documents" JSONB;
ALTER TABLE "devices" ADD COLUMN "online_params" JSONB;
ALTER TABLE "devices" ADD COLUMN "program_list" JSONB;
ALTER TABLE "devices" ADD COLUMN "theoretical_capacity" REAL;
