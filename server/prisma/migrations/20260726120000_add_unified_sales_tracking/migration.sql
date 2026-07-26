-- Unified Sales Tracking (Etsy + Website)
-- Purely additive: creates two new tables and no changes to existing tables.
-- Safe to run on production with zero data loss risk.

-- CreateTable: Sale
CREATE TABLE `Sale` (
    `id` VARCHAR(191) NOT NULL,
    `channel` ENUM('WEBSITE', 'ETSY') NOT NULL,
    `externalReceiptId` VARCHAR(191) NULL,
    `stripeSessionId` VARCHAR(191) NULL,
    `stripePaymentId` VARCHAR(191) NULL,
    `buyerEmail` VARCHAR(191) NOT NULL,
    `buyerName` VARCHAR(191) NULL,
    `buyerPhone` VARCHAR(191) NULL,
    `buyerUserId` VARCHAR(191) NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `subtotal` INTEGER NOT NULL DEFAULT 0,
    `shippingCost` INTEGER NOT NULL DEFAULT 0,
    `shippingDiscount` INTEGER NOT NULL DEFAULT 0,
    `taxTotal` INTEGER NOT NULL DEFAULT 0,
    `vatTotal` INTEGER NOT NULL DEFAULT 0,
    `discountTotal` INTEGER NOT NULL DEFAULT 0,
    `grandTotal` INTEGER NOT NULL DEFAULT 0,
    `processingFees` INTEGER NOT NULL DEFAULT 0,
    `orderNet` INTEGER NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'GBP',
    `shippingLine1` VARCHAR(191) NULL,
    `shippingLine2` VARCHAR(191) NULL,
    `shippingCity` VARCHAR(191) NULL,
    `shippingState` VARCHAR(191) NULL,
    `shippingPostalCode` VARCHAR(191) NULL,
    `shippingCountry` VARCHAR(191) NULL,
    `shippingCountryISO` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'PAID', 'COMPLETED', 'REFUNDED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `paidAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `customerId` VARCHAR(191) NULL,
    `rawPayload` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Sale_externalReceiptId_key`(`externalReceiptId`),
    INDEX `Sale_channel_idx`(`channel`),
    INDEX `Sale_buyerEmail_idx`(`buyerEmail`),
    INDEX `Sale_status_idx`(`status`),
    INDEX `Sale_createdAt_idx`(`createdAt`),
    INDEX `Sale_customerId_idx`(`customerId`),
    INDEX `Sale_stripeSessionId_idx`(`stripeSessionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: SaleItem
CREATE TABLE `SaleItem` (
    `id` VARCHAR(191) NOT NULL,
    `saleId` VARCHAR(191) NOT NULL,
    `externalTransactionId` VARCHAR(191) NULL,
    `externalListingId` VARCHAR(191) NULL,
    `externalProductId` VARCHAR(191) NULL,
    `productId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `sku` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unitPrice` INTEGER NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'GBP',
    `isDigital` BOOLEAN NOT NULL DEFAULT false,
    `variations` TEXT NULL,
    `couponCode` VARCHAR(191) NULL,
    `couponDiscount` INTEGER NOT NULL DEFAULT 0,
    `vatAmount` INTEGER NOT NULL DEFAULT 0,

    INDEX `SaleItem_saleId_idx`(`saleId`),
    INDEX `SaleItem_externalTransactionId_idx`(`externalTransactionId`),
    INDEX `SaleItem_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
