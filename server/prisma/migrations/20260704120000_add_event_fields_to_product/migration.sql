-- Add event/experience fields to Product table
-- These columns were added to the Prisma schema but the migration was missing

ALTER TABLE `Product` ADD COLUMN `name` VARCHAR(191) NULL;
ALTER TABLE `Product` ADD COLUMN `shortDesc` TEXT NULL;
ALTER TABLE `Product` ADD COLUMN `coverImage` VARCHAR(191) NULL;
ALTER TABLE `Product` ADD COLUMN `productCategory` VARCHAR(191) NULL;
ALTER TABLE `Product` ADD COLUMN `themes` TEXT NULL;
ALTER TABLE `Product` ADD COLUMN `maxGroupSize` INT NULL;
ALTER TABLE `Product` ADD COLUMN `productDuration` VARCHAR(191) NULL;
ALTER TABLE `Product` ADD COLUMN `ticketLimit` INT NULL;
ALTER TABLE `Product` ADD COLUMN `venue` TEXT NULL;
ALTER TABLE `Product` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;
