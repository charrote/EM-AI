-- CreateTable
CREATE TABLE "hourly_productions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "device_id" TEXT NOT NULL,
    "hour_start" DATETIME NOT NULL,
    "output" INTEGER NOT NULL DEFAULT 0,
    "defect" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "hourly_productions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "hourly_productions_device_id_hour_start_key" ON "hourly_productions"("device_id", "hour_start");
