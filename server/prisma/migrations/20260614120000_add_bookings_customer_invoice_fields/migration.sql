-- Rename Booking fields to match shared @lozzalingo/bookings controller
ALTER TABLE `Booking` CHANGE COLUMN `customerCompany` `companyName` VARCHAR(191) NULL;
ALTER TABLE `Booking` CHANGE COLUMN `customerMessage` `message` TEXT NULL;

-- Add missing fields expected by the shared bookings controller
ALTER TABLE `Booking` ADD COLUMN `customerId` VARCHAR(191) NULL;
ALTER TABLE `Booking` ADD COLUMN `packageId` VARCHAR(191) NULL;
ALTER TABLE `Booking` ADD COLUMN `eventTime` VARCHAR(191) NULL;
ALTER TABLE `Booking` ADD COLUMN `duration` VARCHAR(191) NULL;
ALTER TABLE `Booking` ADD COLUMN `timeBlocking` VARCHAR(191) NULL;
ALTER TABLE `Booking` ADD COLUMN `totalAmount` INT NULL;
ALTER TABLE `Booking` ADD COLUMN `notes` TEXT NULL;
ALTER TABLE `Booking` ADD COLUMN `assignedTo` VARCHAR(191) NULL;

-- Add new booking statuses
ALTER TABLE `Booking` MODIFY COLUMN `status` ENUM('ENQUIRY', 'QUOTED', 'INVOICE_SENT', 'PENCILLED', 'DEPOSIT_PAID', 'PAID', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'LOST') NOT NULL DEFAULT 'ENQUIRY';

-- Customer CRM model for bookings
CREATE TABLE `Customer` (
  `id` VARCHAR(191) NOT NULL,
  `firstName` VARCHAR(191) NOT NULL,
  `lastName` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(191) NULL,
  `company` VARCHAR(191) NULL,
  `source` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Customer_email_key`(`email`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Invoice model for bookings
CREATE TABLE `Invoice` (
  `id` VARCHAR(191) NOT NULL,
  `bookingId` VARCHAR(191) NOT NULL,
  `lineItems` TEXT NOT NULL,
  `totalAmountPence` INT NOT NULL,
  `description` VARCHAR(191) NULL,
  `status` ENUM('DRAFT', 'SENT', 'PAID', 'VOID', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `stripeInvoiceId` VARCHAR(191) NULL,
  `invoiceNumber` VARCHAR(191) NULL,
  `hostedInvoiceUrl` TEXT NULL,
  `sentAt` DATETIME(3) NULL,
  `paidAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `Invoice_bookingId_idx`(`bookingId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
