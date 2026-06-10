-- CreateTable
CREATE TABLE "device_types" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "icon" TEXT,
    "sort_order" INTEGER DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "parent_id" TEXT,
    "sort_order" INTEGER DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "location" TEXT,
    "contact" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "organizations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "area" TEXT,
    "line" TEXT,
    "health_score" REAL,
    "oee" REAL,
    "mtbf" REAL,
    "mttr" REAL,
    "priority" TEXT NOT NULL DEFAULT 'B',
    "config" JSONB,
    "workshop_id" TEXT,
    "line_id" TEXT,
    "brand" TEXT,
    "model_name" TEXT,
    "serial_no" TEXT,
    "supplier" TEXT,
    "install_date" DATETIME,
    "warranty_until" DATETIME,
    "power_rating" REAL,
    "specifications" JSONB,
    "last_maintenance_at" DATETIME,
    "next_maintenance_at" DATETIME,
    "oee_target" REAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "work_orders" (
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
    "team_id" TEXT,
    "sla_response_min" INTEGER,
    "sla_repair_min" INTEGER,
    "sla_deadline" DATETIME,
    "responded_at" DATETIME,
    "actual_start_at" DATETIME,
    "actual_end_at" DATETIME,
    "root_cause" TEXT,
    "resolution" TEXT,
    "parts_used" JSONB,
    "cost" REAL,
    "satisfaction_score" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "work_orders_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "work_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "work_order_id" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "content" TEXT,
    "duration" INTEGER,
    "images" JSONB,
    "operator" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "work_logs_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT,
    "device_id" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'daily',
    "operator_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "items" JSONB,
    "abnormal_count" INTEGER,
    "triggered_wo_id" TEXT,
    "done_at" DATETIME,
    "location" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inspections_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inspections_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "inspection_plans" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "toolings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_stock',
    "device_id" TEXT,
    "location" TEXT,
    "supplier" TEXT,
    "theoretical_life" INTEGER,
    "life_unit" TEXT,
    "life_used" INTEGER,
    "life_remaining" INTEGER,
    "health_score" REAL,
    "purchase_date" DATETIME,
    "purchase_cost" REAL,
    "last_maintenance_at" DATETIME,
    "config" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "toolings_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "knowledge_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "fault_type" TEXT,
    "symptom" TEXT,
    "cause" TEXT,
    "solution" TEXT,
    "tags" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "source_wo_id" TEXT,
    "created_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "inspection_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "device_type" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'daily',
    "frequency" INTEGER NOT NULL,
    "items" JSONB,
    "sop_url" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "maintenance_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "device_id" TEXT,
    "device_type" TEXT,
    "type" TEXT NOT NULL DEFAULT 'daily',
    "triggerType" TEXT NOT NULL DEFAULT 'time',
    "trigger_value" INTEGER NOT NULL,
    "interval_days" INTEGER,
    "items" JSONB,
    "sop_url" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_executed_at" DATETIME,
    "next_scheduled_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT,
    "device_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "operator_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "steps" JSONB,
    "parts_used" JSONB,
    "result" TEXT,
    "before_images" JSONB,
    "after_images" JSONB,
    "duration" INTEGER,
    "notes" TEXT,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "rca_analyses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "work_order_id" TEXT,
    "device_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "problem_desc" TEXT NOT NULL,
    "why_chain" JSONB,
    "fishbone_data" JSONB,
    "root_cause" TEXT,
    "improvement" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "improvement_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "loss_type" TEXT,
    "current_value" REAL,
    "target_value" REAL,
    "unit" TEXT,
    "assignee" TEXT,
    "deadline" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    "progress" INTEGER DEFAULT 0,
    "effect_data" JSONB,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "device_types_name_key" ON "device_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "device_types_code_key" ON "device_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");

-- CreateIndex
CREATE INDEX "organizations_parent_id_idx" ON "organizations"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "devices_code_key" ON "devices"("code");

-- CreateIndex
CREATE INDEX "devices_workshop_id_idx" ON "devices"("workshop_id");

-- CreateIndex
CREATE INDEX "devices_line_id_idx" ON "devices"("line_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_code_key" ON "work_orders"("code");

-- CreateIndex
CREATE UNIQUE INDEX "toolings_code_key" ON "toolings"("code");
