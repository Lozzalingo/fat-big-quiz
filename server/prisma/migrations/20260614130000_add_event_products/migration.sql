-- Event Product models for @lozzalingo/events-ui
-- Separate from the e-commerce Product model

CREATE TABLE `EventProduct` (
  `id` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `shortDesc` TEXT NULL,
  `coverImage` VARCHAR(191) NULL,
  `category` VARCHAR(191) NULL,
  `themes` TEXT NULL,
  `maxGroupSize` INT NULL,
  `venue` TEXT NULL,
  `duration` VARCHAR(191) NULL,
  `ticketLimit` INT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `displayOrder` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `EventProduct_slug_key`(`slug`),
  INDEX `EventProduct_isActive_idx`(`isActive`),
  INDEX `EventProduct_category_idx`(`category`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EventProductSection` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `productId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL DEFAULT 'text',
  `content` TEXT NULL,
  `listItems` TEXT NULL,
  `isCollapsible` BOOLEAN NOT NULL DEFAULT true,
  `displayOrder` INT NOT NULL DEFAULT 0,
  INDEX `EventProductSection_productId_idx`(`productId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EventProductImage` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `productId` VARCHAR(191) NOT NULL,
  `url` VARCHAR(191) NOT NULL,
  `alt` VARCHAR(191) NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  INDEX `EventProductImage_productId_idx`(`productId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EventPackage` (
  `id` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `duration` VARCHAR(191) NULL,
  `minPlayers` INT NULL,
  `maxPlayers` INT NULL,
  `pricePerPerson` INT NULL,
  `flatPrice` INT NULL,
  `minReserve` INT NULL,
  `additionalPlayerPrice` INT NULL,
  `includes` TEXT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `displayOrder` INT NOT NULL DEFAULT 0,
  `bookingType` ENUM('PRIVATE', 'PUBLIC', 'PLAY_TODAY') NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `EventPackage_productId_slug_key`(`productId`, `slug`),
  INDEX `EventPackage_bookingType_idx`(`bookingType`),
  INDEX `EventPackage_isActive_idx`(`isActive`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add eventProductId to CalendarEvent
ALTER TABLE `CalendarEvent` ADD COLUMN `eventProductId` VARCHAR(191) NULL;

-- Add foreign key constraints
ALTER TABLE `EventProductSection` ADD CONSTRAINT `EventProductSection_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `EventProduct`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `EventProductImage` ADD CONSTRAINT `EventProductImage_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `EventProduct`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `EventPackage` ADD CONSTRAINT `EventPackage_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `EventProduct`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CalendarEvent` ADD CONSTRAINT `CalendarEvent_eventProductId_fkey` FOREIGN KEY (`eventProductId`) REFERENCES `EventProduct`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
