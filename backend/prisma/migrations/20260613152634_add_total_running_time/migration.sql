-- AlterTable
ALTER TABLE "devices" ADD COLUMN "total_running_time" REAL;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "oee_target" REAL;

-- CreateTable
CREATE TABLE "knowledge_favorites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knowledge_favorites_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "knowledge_entries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leader" TEXT,
    "member_count" INTEGER DEFAULT 0,
    "shift" TEXT,
    "workshop_id" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "work_calendars" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "is_work_day" BOOLEAN NOT NULL DEFAULT true,
    "shift_type" TEXT,
    "holiday_name" TEXT,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_knowledge_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'case',
    "title" TEXT NOT NULL,
    "equipment_type" TEXT,
    "fault_part" TEXT,
    "severity" TEXT,
    "fault_type" TEXT,
    "symptom" TEXT,
    "cause" TEXT,
    "solution" TEXT,
    "prevention" TEXT,
    "content" JSONB,
    "tags" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "views" INTEGER NOT NULL DEFAULT 0,
    "author" TEXT,
    "source_wo_id" TEXT,
    "created_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_knowledge_entries" ("cause", "created_at", "created_by", "fault_type", "id", "solution", "source_wo_id", "status", "symptom", "tags", "title", "updated_at") SELECT "cause", "created_at", "created_by", "fault_type", "id", "solution", "source_wo_id", "status", "symptom", "tags", "title", "updated_at" FROM "knowledge_entries";
DROP TABLE "knowledge_entries";
ALTER TABLE "new_knowledge_entries" RENAME TO "knowledge_entries";
CREATE TABLE "new_work_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'repair',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "device_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'P1',
    "fault_type" TEXT,
    "fault_code" TEXT,
    "description" TEXT,
    "ai_recommendation" JSONB,
    "assignee_id" TEXT,
    "handler_id" TEXT,
    "reviewer_id" TEXT,
    "completed_by" TEXT,
    "team_id" TEXT,
    "sla_response_min" INTEGER,
    "sla_repair_min" INTEGER,
    "sla_deadline" DATETIME,
    "responded_at" DATETIME,
    "actual_start_at" DATETIME,
    "verified_at" DATETIME,
    "actual_end_at" DATETIME,
    "root_cause" TEXT,
    "resolution" TEXT,
    "parts_used" JSONB,
    "cost" REAL,
    "satisfaction_score" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "work_orders_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "work_orders_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_work_orders" ("actual_end_at", "actual_start_at", "ai_recommendation", "assignee_id", "code", "cost", "created_at", "description", "device_id", "fault_code", "fault_type", "id", "parts_used", "priority", "resolution", "responded_at", "root_cause", "satisfaction_score", "sla_deadline", "sla_repair_min", "sla_response_min", "source", "status", "team_id", "type", "updated_at") SELECT "actual_end_at", "actual_start_at", "ai_recommendation", "assignee_id", "code", "cost", "created_at", "description", "device_id", "fault_code", "fault_type", "id", "parts_used", "priority", "resolution", "responded_at", "root_cause", "satisfaction_score", "sla_deadline", "sla_repair_min", "sla_response_min", "source", "status", "team_id", "type", "updated_at" FROM "work_orders";
DROP TABLE "work_orders";
ALTER TABLE "new_work_orders" RENAME TO "work_orders";
CREATE UNIQUE INDEX "work_orders_code_key" ON "work_orders"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_favorites_user_id_entry_id_key" ON "knowledge_favorites"("user_id", "entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_code_key" ON "teams"("code");

-- CreateIndex
CREATE INDEX "teams_workshop_id_idx" ON "teams"("workshop_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_calendars_year_month_day_key" ON "work_calendars"("year", "month", "day");
