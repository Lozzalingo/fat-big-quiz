-- Performance: Add cascade delete on Comment self-relation
-- This allows deleting a parent comment to automatically delete all replies
ALTER TABLE `Comment` DROP FOREIGN KEY `Comment_parentId_fkey`;
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Comment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Performance: Add compound index on BlogPost for published + createdAt queries
CREATE INDEX `BlogPost_published_createdAt_idx` ON `BlogPost`(`published`, `createdAt`);
