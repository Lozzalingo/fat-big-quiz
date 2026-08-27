-- AlterTable
ALTER TABLE `Visitor` ADD COLUMN `userId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Visitor_userId_idx` ON `Visitor`(`userId`);

-- AddForeignKey
ALTER TABLE `Visitor` ADD CONSTRAINT `Visitor_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
