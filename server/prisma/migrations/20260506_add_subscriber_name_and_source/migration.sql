-- AlterTable
ALTER TABLE `Subscriber` ADD COLUMN `firstName` VARCHAR(191) NULL,
    ADD COLUMN `lastName` VARCHAR(191) NULL,
    ADD COLUMN `source` VARCHAR(191) NULL,
    ADD COLUMN `sourcePath` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Subscriber_source_idx` ON `Subscriber`(`source`);
