-- MySQL dump 10.13  Distrib 5.7.24, for osx11.1 (x86_64)
--
-- Host: localhost    Database: fat_big_quiz
-- ------------------------------------------------------
-- Server version	9.3.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `_PostTags`
--

DROP TABLE IF EXISTS `_PostTags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `_PostTags` (
  `A` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `B` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  UNIQUE KEY `_PostTags_AB_unique` (`A`,`B`),
  KEY `_PostTags_B_index` (`B`),
  CONSTRAINT `_PostTags_A_fkey` FOREIGN KEY (`A`) REFERENCES `BlogPost` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `_PostTags_B_fkey` FOREIGN KEY (`B`) REFERENCES `Tag` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_PostTags`
--

LOCK TABLES `_PostTags` WRITE;
/*!40000 ALTER TABLE `_PostTags` DISABLE KEYS */;
INSERT INTO `_PostTags` VALUES ('8fda6b7e-7f56-430f-b7c1-4ef4368dbfc6','446cfd03-a0ef-421e-9c89-de2382c501ae'),('8fda6b7e-7f56-430f-b7c1-4ef4368dbfc6','538b90b2-4991-49b6-aae4-77c5bca94339'),('8fda6b7e-7f56-430f-b7c1-4ef4368dbfc6','8fcd25ee-f00a-4eee-bd50-c0bfa28b1ef2');
/*!40000 ALTER TABLE `_PostTags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES ('1c93e5a6-6b21-4f31-a990-c8680e07ff91','f8e420e25f250d2df66c3018396cdde40c3b76ac187ae4428379ec82de3a2bf6','2025-05-19 18:28:04.635','20250519182804_add_settings_table',NULL,NULL,'2025-05-19 18:28:04.623',1),('5b4510e7-2dc1-4f0d-a4d7-a854c567a4f6','c957588465dc4bd05f5f0cec44583ff0c58516d219495a3a58c1efd5b936a78f','2025-05-19 14:00:27.691','20250519_baseline','',NULL,'2025-05-19 14:00:27.691',0);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `BlogPost`
--

DROP TABLE IF EXISTS `BlogPost`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `BlogPost` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `excerpt` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `coverImage` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `published` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `metaTitle` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metaDescription` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `authorId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoryId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `viewCount` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `BlogPost_slug_key` (`slug`),
  KEY `BlogPost_authorId_fkey` (`authorId`),
  KEY `BlogPost_categoryId_fkey` (`categoryId`),
  CONSTRAINT `BlogPost_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `BlogPost_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `BlogPost`
--

LOCK TABLES `BlogPost` WRITE;
/*!40000 ALTER TABLE `BlogPost` DISABLE KEYS */;
INSERT INTO `BlogPost` VALUES ('8fda6b7e-7f56-430f-b7c1-4ef4368dbfc6','Rethinking Game Theory: A Call for a New Perspective','rethinking-game-theory','<h1>Rethinking Game Theory: A Call for a New Perspective</h1><p>For decades, economists have leaned heavily on game theory as a cornerstone of strategic decision-making and behavioral economics. However, a fresh perspective suggests that the traditional understanding of game theory might be flawed. Let\'s delve into why game theory, as we know it, might be broken and how we can reframe our approach to it.</p><h2>The Traditional Understanding of Game Theory</h2><p>Game theory, a mathematical model of strategic interaction among rational decision-makers, has been widely used to predict outcomes in economics, political science, and psychology. The most well-known example is the Prisoner\'s Dilemma, which suggests that individuals, acting in their self-interest, often make decisions that are suboptimal for the group.</p><h2>Challenging the Norms</h2><p>Gary Stevenson, an insightful critic of conventional economics, argues that for seventy years, economists have misunderstood game theory\'s core principles. The assumption of inherent selfishness as the fundamental driver is being questioned. Commenters on Stevenson\'s video bring fresh insights:</p><ul><li><strong>@andybrice2711</strong> highlights a strategy known as \"Forgiving Tit-for-Tat,\" which suggests a more nuanced, cooperative approach that mirrors real-life human interactions.</li><li><strong>@arimolyki</strong> criticizes the use of the Prisoner\'s Dilemma to showcase selfishness, suggesting instead that it reflects a system designed to incentivize such behavior.</li><li><strong>@hongimaster</strong> points out that the dilemma might be more about informational deficits rather than pure selfishness, indicating that communication could lead to better collective outcomes.</li></ul><h2>Educating for Change</h2><p>Stevenson\'s call to action is clear: we must educate ourselves about the economy and work towards collective betterment. He suggests:</p><ul><li>Understanding societal issues and educating ourselves on economic principles.</li><li>Working towards the collective good by acting in unselfish ways.</li><li>Protecting ordinary people from exploitation by the powerful and wealthy.</li><li>Engaging in collective action to address societal challenges like inequality.</li></ul><h2>Moving Forward with Game Theory</h2><p>To truly utilize the potential of game theory, it\'s crucial to integrate communication and cooperation into its framework. This shift could transform how we perceive strategic interactions, moving from a focus on competition to one on collaboration.</p><p>In conclusion, while traditional game theory has its merits, it\'s time to expand our understanding and application of these concepts. By doing so, we can foster a more cooperative society that recognizes the value of working together for a common good.</p><h2>Join the Conversation</h2><p>We encourage readers to engage with these ideas and start conversations in their communities. Visit <a href=\"https://www.garyseconomics.org\" rel=\"noopener noreferrer\" target=\"_blank\">Gary\'s Economics</a> for more insights, and connect on social media to share your thoughts.</p>','Exploring a new perspective on game theory, challenging traditional no...','blog-rethinking-game-theory-a-call-for-a-new-perspectiv-h3o5_1747329513921.jpg',1,'2025-05-15 17:18:33.939','2025-05-15 17:23:54.449','Rethinking Game Theory: A New Perspective','Explore why traditional game theory might be flawed and how we can adopt a more cooperative approach in strategic decision-making.','c39c7168-21ca-46ac-b37d-f9b4582bd5df','530f087c-ec94-4683-85db-536b213c5da3',NULL);
/*!40000 ALTER TABLE `BlogPost` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Category`
--

DROP TABLE IF EXISTS `Category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Category` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `coverImage` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metaDescription` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metaTitle` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('PRODUCT','BLOG') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PRODUCT',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Category`
--

LOCK TABLES `Category` WRITE;
/*!40000 ALTER TABLE `Category` DISABLE KEYS */;
INSERT INTO `Category` VALUES ('0c593d30-377a-4c1a-84b7-423c515037f6','merchandise','e2fabb61987397.5a811b51939da_1747324069465.jpg',NULL,NULL,'PRODUCT'),('530f087c-ec94-4683-85db-536b213c5da3','behind-the-scenes','maxresdefault_1747490184849.jpg',NULL,NULL,'BLOG'),('74c29f21-2e2e-429a-a2c6-8251c1b0e81c','the-poo-affair','1_6b54ff34-acdd-40e6-a08a-f2bfa33a1c7a_800x_1747492845575.webp','There was a poo war, with many farts. ','Poo Flying Everywhere','BLOG');
/*!40000 ALTER TABLE `Category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Comment`
--

DROP TABLE IF EXISTS `Comment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Comment` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `userId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `postId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `parentId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `Comment_postId_fkey` (`postId`),
  KEY `Comment_userId_fkey` (`userId`),
  KEY `Comment_parentId_fkey` (`parentId`),
  CONSTRAINT `Comment_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Comment` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Comment_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `BlogPost` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Comment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Comment`
--

LOCK TABLES `Comment` WRITE;
/*!40000 ALTER TABLE `Comment` DISABLE KEYS */;
INSERT INTO `Comment` VALUES ('01466bc8-4fe4-412a-81b6-426c19f03638','Who\'s peeling potatoes then? ','2025-05-19 12:25:50.269','77KxXp0TbXRZ4yhdyG2xK','8fda6b7e-7f56-430f-b7c1-4ef4368dbfc6',NULL),('06284577-62f7-4a56-a856-d5134757cbd3','Don\'t watch that\n','2025-05-17 00:27:05.613','c39c7168-21ca-46ac-b37d-f9b4582bd5df','8fda6b7e-7f56-430f-b7c1-4ef4368dbfc6',NULL),('5f077030-8bc9-4f43-be83-b8f40cf87f6f','GAAAAY','2025-05-17 00:27:20.417','c39c7168-21ca-46ac-b37d-f9b4582bd5df','8fda6b7e-7f56-430f-b7c1-4ef4368dbfc6','06284577-62f7-4a56-a856-d5134757cbd3'),('b36316d9-36be-4463-8ecd-dfd7023e7ba8','@Big L ','2025-05-18 16:50:20.841','c39c7168-21ca-46ac-b37d-f9b4582bd5df','8fda6b7e-7f56-430f-b7c1-4ef4368dbfc6','5f077030-8bc9-4f43-be83-b8f40cf87f6f');
/*!40000 ALTER TABLE `Comment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Customer_order`
--

DROP TABLE IF EXISTS `Customer_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Customer_order` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `company` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apartment` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `postalCode` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `dateTime` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `status` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `city` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `country` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `orderNotice` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total` int NOT NULL,
  `firstName` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `lastName` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `discountCodeId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `Customer_order_discountCodeId_fkey` (`discountCodeId`),
  CONSTRAINT `Customer_order_discountCodeId_fkey` FOREIGN KEY (`discountCodeId`) REFERENCES `DiscountCode` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Customer_order`
--

LOCK TABLES `Customer_order` WRITE;
/*!40000 ALTER TABLE `Customer_order` DISABLE KEYS */;
/*!40000 ALTER TABLE `Customer_order` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_order_product`
--

DROP TABLE IF EXISTS `customer_order_product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customer_order_product` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerOrderId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `productId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `customer_order_product_customerOrderId_fkey` (`customerOrderId`),
  KEY `customer_order_product_productId_fkey` (`productId`),
  CONSTRAINT `customer_order_product_customerOrderId_fkey` FOREIGN KEY (`customerOrderId`) REFERENCES `Customer_order` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `customer_order_product_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_order_product`
--

LOCK TABLES `customer_order_product` WRITE;
/*!40000 ALTER TABLE `customer_order_product` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_order_product` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `DiscountCode`
--

DROP TABLE IF EXISTS `DiscountCode`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `DiscountCode` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `discountType` enum('PERCENTAGE','FIXED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `discountValue` double NOT NULL,
  `startDate` datetime(3) DEFAULT NULL,
  `endDate` datetime(3) DEFAULT NULL,
  `minPurchase` int DEFAULT NULL,
  `maxRedemptions` int DEFAULT NULL,
  `currentRedemptions` int NOT NULL DEFAULT '0',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `DiscountCode_code_key` (`code`),
  KEY `DiscountCode_code_idx` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `DiscountCode`
--

LOCK TABLES `DiscountCode` WRITE;
/*!40000 ALTER TABLE `DiscountCode` DISABLE KEYS */;
INSERT INTO `DiscountCode` VALUES ('3e264d1a-618f-4217-90bd-551f2d9bcbb6','MarioSave20','PERCENTAGE',20,'2025-05-19 00:00:00.000',NULL,NULL,NULL,0,1,'2025-05-19 17:03:24.946','2025-05-19 17:10:34.418');
/*!40000 ALTER TABLE `DiscountCode` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `DiscountCodeProduct`
--

DROP TABLE IF EXISTS `DiscountCodeProduct`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `DiscountCodeProduct` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `discountCodeId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `productId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `DiscountCodeProduct_discountCodeId_productId_key` (`discountCodeId`,`productId`),
  KEY `DiscountCodeProduct_discountCodeId_idx` (`discountCodeId`),
  KEY `DiscountCodeProduct_productId_idx` (`productId`),
  CONSTRAINT `DiscountCodeProduct_discountCodeId_fkey` FOREIGN KEY (`discountCodeId`) REFERENCES `DiscountCode` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `DiscountCodeProduct_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `DiscountCodeProduct`
--

LOCK TABLES `DiscountCodeProduct` WRITE;
/*!40000 ALTER TABLE `DiscountCodeProduct` DISABLE KEYS */;
/*!40000 ALTER TABLE `DiscountCodeProduct` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Image`
--

DROP TABLE IF EXISTS `Image`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Image` (
  `imageID` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `productID` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `image` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`imageID`),
  KEY `Image_productID_fkey` (`productID`),
  CONSTRAINT `Image_productID_fkey` FOREIGN KEY (`productID`) REFERENCES `Product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Image`
--

LOCK TABLES `Image` WRITE;
/*!40000 ALTER TABLE `Image` DISABLE KEYS */;
/*!40000 ALTER TABLE `Image` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Notification`
--

DROP TABLE IF EXISTS `Notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Notification` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipientId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `senderId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entityId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `entityType` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `read` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Notification_recipientId_fkey` (`recipientId`),
  KEY `Notification_senderId_fkey` (`senderId`),
  CONSTRAINT `Notification_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Notification_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Notification`
--

LOCK TABLES `Notification` WRITE;
/*!40000 ALTER TABLE `Notification` DISABLE KEYS */;
/*!40000 ALTER TABLE `Notification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Product`
--

DROP TABLE IF EXISTS `Product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Product` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mainImage` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` double NOT NULL DEFAULT '0',
  `rating` int NOT NULL DEFAULT '0',
  `description` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `manufacturer` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `inStock` int NOT NULL DEFAULT '1',
  `categoryId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `viewCount` int DEFAULT NULL,
  `downloadFile` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `downloadLimit` int DEFAULT NULL,
  `features` longtext COLLATE utf8mb4_unicode_ci,
  `productType` enum('PHYSICAL','DIGITAL_DOWNLOAD','SUBSCRIPTION','EVENT') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PHYSICAL',
  `stripePriceId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stripeProductId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `videoUrl` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quizFormatId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Product_slug_key` (`slug`),
  KEY `Product_categoryId_fkey` (`categoryId`),
  KEY `Product_quizFormatId_idx` (`quizFormatId`),
  CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Product_quizFormatId_fkey` FOREIGN KEY (`quizFormatId`) REFERENCES `QuizFormat` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Product`
--

LOCK TABLES `Product` WRITE;
/*!40000 ALTER TABLE `Product` DISABLE KEYS */;
INSERT INTO `Product` VALUES ('04059d29-d986-4d04-b173-7d3adfbe8cd9','printable-deluxe-biscuit-picture','Printable Biscuit Picture Quiz Mixed Level','Biscuit_Picture_Etsy_Image_1767748242485.png',1.99,5,'Our quizzes are crafted for easy downloading, printing, and digital display, perfect for family quiz nights, local pub quizzes, or virtual gatherings.\n\nEach download includes both full-colour and low-ink options, along with a question sheet, answer sheet, and dedicated spaces for team names and scores.\n\nFiles are provided in PDF format and are available for download immediately after purchase through the Etsy website or a mobile browser.','Fat Big Quiz',1,'0c593d30-377a-4c1a-84b7-423c515037f6',NULL,'[\"Coloured_Questions_1767741982368.pdf\",\"Answers_1767742030035.pdf\",\"Low_Ink_Questions_pdf_1767742040235.pdf\"]',NULL,'Low ink option\n','DIGITAL_DOWNLOAD',NULL,NULL,'','270a5198-621c-4abc-86e4-6c4fe91ef967'),('b21cbc36-0c88-495a-891a-bad5ad1e7234','printable-deluxe-biscuit-picture-copy-1767807488829','Printable Biscuit Picture Quiz Mixed Level (Copy)','Biscuit_Picture_Etsy_Image_1767748242485.png',1.99,5,'Our quizzes are crafted for easy downloading, printing, and digital display, perfect for family quiz nights, local pub quizzes, or virtual gatherings.\n\nEach download includes both full-colour and low-ink options, along with a question sheet, answer sheet, and dedicated spaces for team names and scores.\n\nFiles are provided in PDF format and are available for download immediately after purchase through the Etsy website or a mobile browser.','Fat Big Quiz',1,'0c593d30-377a-4c1a-84b7-423c515037f6',NULL,'[\"Coloured_Questions_1767741982368.pdf\",\"Answers_1767742030035.pdf\",\"Low_Ink_Questions_pdf_1767742040235.pdf\"]',NULL,'Low ink option\n','DIGITAL_DOWNLOAD',NULL,NULL,'','270a5198-621c-4abc-86e4-6c4fe91ef967');
/*!40000 ALTER TABLE `Product` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ProductCategory`
--

DROP TABLE IF EXISTS `ProductCategory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ProductCategory` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoryId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ProductCategory_productId_categoryId_key` (`productId`,`categoryId`),
  KEY `ProductCategory_productId_idx` (`productId`),
  KEY `ProductCategory_categoryId_idx` (`categoryId`),
  CONSTRAINT `ProductCategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProductCategory_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ProductCategory`
--

LOCK TABLES `ProductCategory` WRITE;
/*!40000 ALTER TABLE `ProductCategory` DISABLE KEYS */;
/*!40000 ALTER TABLE `ProductCategory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Purchase`
--

DROP TABLE IF EXISTS `Purchase`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Purchase` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stripePaymentId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stripeSessionId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `downloadCount` int NOT NULL DEFAULT '0',
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expiresAt` datetime(3) DEFAULT NULL,
  `downloadToken` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Purchase_downloadToken_key` (`downloadToken`),
  KEY `Purchase_productId_idx` (`productId`),
  KEY `Purchase_userId_idx` (`userId`),
  KEY `Purchase_stripeSessionId_idx` (`stripeSessionId`),
  KEY `Purchase_downloadToken_idx` (`downloadToken`),
  CONSTRAINT `Purchase_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Purchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Purchase`
--

LOCK TABLES `Purchase` WRITE;
/*!40000 ALTER TABLE `Purchase` DISABLE KEYS */;
INSERT INTO `Purchase` VALUES ('ca392deb-07f0-4451-838d-62a285add54d',NULL,'laurencestephan@hotmail.com','04059d29-d986-4d04-b173-7d3adfbe8cd9',NULL,'cs_test_a1w2fFg56MBrW4MNZ47BQ92KAV5nofP2V5Rtq6MJiTvchS46YAQbHiN1DB',4,'completed','2026-01-07 16:18:03.208','2026-01-14 16:18:03.208','dc1f411b99daff5c12418a606f7019cebdc9395b2e0fe12865bd5c5408eb2fe8');
/*!40000 ALTER TABLE `Purchase` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `QuizFormat`
--

DROP TABLE IF EXISTS `QuizFormat`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `QuizFormat` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `displayName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` longtext COLLATE utf8mb4_unicode_ci,
  `explainerImages` longtext COLLATE utf8mb4_unicode_ci,
  `displayOrder` int NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `QuizFormat_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `QuizFormat`
--

LOCK TABLES `QuizFormat` WRITE;
/*!40000 ALTER TABLE `QuizFormat` DISABLE KEYS */;
INSERT INTO `QuizFormat` VALUES ('270a5198-621c-4abc-86e4-6c4fe91ef967','fancy-quiz','Fancy Quiz','A premium quiz format with enhanced features and presentation.','[\"Design_for_all_occasions_1767729682941.png\",\"Simple_Description_1767729234915.png\",\"Description_1767729682694.png\",\"Thank_You_1767729682325.png\",\"How_to_print_1767729680804.png\"]',3,'2026-01-06 16:49:51.762','2026-01-06 20:01:48.064'),('8c32f486-de64-47f0-a3f6-09738f87b4da','music-quiz','Music Quiz','Quiz format featuring audio clips and music-related questions.',NULL,2,'2026-01-06 16:49:51.760','2026-01-06 16:49:51.760'),('eed1f399-ce27-4d1a-8ab6-1b5dc410f0f5','basic-quiz','Basic Quiz','A straightforward quiz format with questions and answers.',NULL,1,'2026-01-06 16:49:51.758','2026-01-06 16:49:51.758');
/*!40000 ALTER TABLE `QuizFormat` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Settings`
--

DROP TABLE IF EXISTS `Settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `orders` tinyint(1) NOT NULL DEFAULT '1',
  `products` tinyint(1) NOT NULL DEFAULT '1',
  `blog` tinyint(1) NOT NULL DEFAULT '1',
  `users` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Settings_userId_fkey` (`userId`),
  CONSTRAINT `Settings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Settings`
--

LOCK TABLES `Settings` WRITE;
/*!40000 ALTER TABLE `Settings` DISABLE KEYS */;
INSERT INTO `Settings` VALUES (1,'c39c7168-21ca-46ac-b37d-f9b4582bd5df',1,1,1,1,'2025-05-19 18:59:38.035','2025-05-22 22:53:43.103');
/*!40000 ALTER TABLE `Settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Subscriber`
--

DROP TABLE IF EXISTS `Subscriber`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Subscriber` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `subscribedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `optIn` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `Subscriber_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Subscriber`
--

LOCK TABLES `Subscriber` WRITE;
/*!40000 ALTER TABLE `Subscriber` DISABLE KEYS */;
INSERT INTO `Subscriber` VALUES ('1d75584e-af4d-44c3-be2d-0e7f11b9462b','laurencestephan@hotmail.com','2025-05-15 14:57:45.954',0);
/*!40000 ALTER TABLE `Subscriber` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Tag`
--

DROP TABLE IF EXISTS `Tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Tag` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Tag_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Tag`
--

LOCK TABLES `Tag` WRITE;
/*!40000 ALTER TABLE `Tag` DISABLE KEYS */;
INSERT INTO `Tag` VALUES ('446cfd03-a0ef-421e-9c89-de2382c501ae','cooperation'),('538b90b2-4991-49b6-aae4-77c5bca94339','economics'),('8fcd25ee-f00a-4eee-bd50-c0bfa28b1ef2','game theory');
/*!40000 ALTER TABLE `Tag` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `User`
--

DROP TABLE IF EXISTS `User`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `User` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'user',
  `avatar` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bio` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `firstName` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lastName` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `userName` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stripeCustomerId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`),
  UNIQUE KEY `User_userName_key` (`userName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `User`
--

LOCK TABLES `User` WRITE;
/*!40000 ALTER TABLE `User` DISABLE KEYS */;
INSERT INTO `User` VALUES ('1c7e23d3-964e-446e-96a0-09a3e68ff7ad','poo@wank.com','$2a$05$jPr8ESw33cTYitMmDGOmhuuFHRUPJKjt2QbUe7zJyj1XBR/fhQB.q','user',NULL,'I\'m the poo wank man','Poo','Wank','2025-05-15 14:57:45.954','Poo Master',NULL),('77KxXp0TbXRZ4yhdyG2xK','potatopeeler@gmail.com','$2a$05$FVRW4AgITzN.cGXQo6QdtumKDCiv3Y2vnEAUizUTSMajS4qcwhB3y','user','image (1)_1747657625109.jpg',NULL,NULL,NULL,'2025-05-19 13:24:42.644',NULL,NULL),('c39c7168-21ca-46ac-b37d-f9b4582bd5df','laurencestephan@hotmail.com','$2a$05$V6qkJnNa2g/xLwt62R.5/ORTlDOVULkW5uGGOqEa/xRKQbmJBBgAy','admin','Etsy_Sqaure_1767720556837.png','Big man on campus','Laurence','Stephan','2025-05-15 14:57:45.954','Big L',NULL),('e8418304-616d-4276-bad1-8216dc2d74b6','asdasdawsd@asdasd.com','$2a$05$HFW6hHx8zXl7kx1wP69PuupC8kV1E2C1xjPsthdyx1fao6FTdpAvS','user',NULL,'asdasd','asdasd','adasd','2025-05-18 14:13:20.899',NULL,NULL),('gDhy676Ydkxn-eb68HPM3','Test@test.com','$2a$05$8g3OWaKOaZFetuGxAPqNEu1d7fcEUybp/.sNwQ9LM86MgXRN285DG','user',NULL,NULL,NULL,NULL,'2025-05-15 14:57:45.954',NULL,NULL);
/*!40000 ALTER TABLE `User` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Visitor`
--

DROP TABLE IF EXISTS `Visitor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Visitor` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `referrer` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referrerCategory` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` double DEFAULT NULL,
  `longitude` double DEFAULT NULL,
  `timestamp` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `path` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actions` json DEFAULT NULL,
  `browser` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deviceType` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `os` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sessionId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timeOnPage` int DEFAULT NULL,
  `userAgent` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Visitor`
--

LOCK TABLES `Visitor` WRITE;
/*!40000 ALTER TABLE `Visitor` DISABLE KEYS */;
INSERT INTO `Visitor` VALUES ('007e19fd-b06e-4b58-87ce-79845bcd9f0f','::1','localhost','Other','Test City','Test Country',-19.86264104014559,76.13924943779091,'2025-05-20 15:57:00.956','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('04c1b6d8-6964-4eb0-9e12-6bd519bba4b2','::1','youtube.com','Social Media','Test City','Test Country',-40.53073302877233,-46.5975928561102,'2025-05-20 15:48:03.107','/features',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('0754c267-2c38-43c1-93f6-bf6eec019875','::1','Direct','Direct','Test City','Test Country',-47.7327545602474,164.2029962567133,'2025-05-20 15:48:09.760','/features',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('07c4d73c-6a1c-4088-839e-9517944fa0c5','::1','localhost','Other','Test City','Test Country',-55.09223405351118,-119.7934167303404,'2025-05-20 15:56:55.612','/admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('0a8fcef3-2adc-4a6a-bdc5-0994b55bc9dc','::1','localhost','Other','Test City','Test Country',-73.75945272734671,78.44396103847765,'2026-01-06 13:35:26.651','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('0b7f5b2f-aa99-4b5f-933b-1420fb01a9ad','::1','localhost','Other','Test City','Test Country',-84.34639125054792,-38.31264356346247,'2026-01-07 16:18:21.145','/download/cs_test_a1w2fFg56MBrW4MNZ47BQ92KAV5nofP2V5Rtq6MJiTvchS46YAQbHiN1DB',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('114e03b8-91d4-4a70-a606-2714be0496b5','::1','localhost','Other','Test City','Test Country',38.73082691739461,16.58781396488169,'2025-05-20 15:53:36.026','/admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('16a17cc8-3761-4781-ad03-40937834135e','::1','linkedin.com','Social Media','Test City','Test Country',0.8348165596632384,63.87584710320166,'2025-05-20 15:48:04.125','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('1b2c2f8c-98f0-4a2e-a50a-f86d4fd3bd06','::1','localhost','Other','Test City','Test Country',-7.558764253021664,121.6848687378974,'2026-01-06 13:37:47.091','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('1ccd851b-951e-4bca-9d8d-60e14349d198','::1','localhost','Other','Test City','Test Country',-16.04314020633272,-77.42995090082925,'2025-05-20 15:54:42.353','/admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('1ebc64fd-a010-4890-b583-9f882bf8f018','::1','localhost','Other','Test City','Test Country',84.59468553319545,96.88688497681756,'2026-01-07 00:46:39.236','/shop',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('1fea91fa-9b6e-411d-84c3-123e8687be77','::1','localhost','Other','Test City','Test Country',48.87328367987226,91.46676704356935,'2026-01-07 16:24:47.420','/download/test_session_123',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('2070055b-a616-4a52-8ffb-ec17a7b93f6c','::1','facebook.com','Social Media','Test City','Test Country',2.9600808763619,-100.5983522756021,'2025-05-20 15:48:06.177','/about',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('25cae325-98cf-45a1-a1d6-82295c198b43','::1','localhost','Other','Test City','Test Country',31.10481322803213,85.5751748436598,'2026-01-06 17:30:59.594','/profile/edit',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('28bf0988-d400-433b-98fc-0f0baa52bffa','::1','localhost','Other','Test City','Test Country',-7.161698737604823,-36.51458630926163,'2026-01-06 13:31:49.512','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('2f362d21-07d9-485e-b2e3-de002c33e4b0','::1','localhost','Other','Test City','Test Country',-3.947280852009811,111.9888190845513,'2025-05-20 15:56:55.614','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('303d9b7d-12c7-43e1-abac-2789a8c42952','::1','localhost','Other','Test City','Test Country',-42.78250308832188,123.1536028992234,'2026-01-07 15:51:47.403','/download/test_session_123',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('305bc343-1aab-4513-976f-b5e4be820dcf','::1','mail.google.com','Organic Search','Test City','Test Country',57.89994928482108,-5.793325148399077,'2025-05-20 15:48:02.597','/services',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('379bdfb7-56ed-4be6-a660-7c2a6bcf3fc5','::1','localhost','Other','Test City','Test Country',-87.9712244821963,118.5278656202543,'2026-01-07 00:16:36.547','/shop',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('3b783ef8-c105-40a2-9e8a-657bfce64994','::1','localhost','Other','Test City','Test Country',-69.42569701028405,-162.8186556490015,'2026-01-07 00:08:12.488','/shop',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('3bd0801b-ace1-421c-9f7e-305b58e87adf','::1','localhost','Other','Test City','Test Country',87.98812730399061,109.5209469421483,'2026-01-06 01:34:05.137','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('42c0a987-96de-43bf-a3f5-d962e7f67d2c','::1','localhost','Other','Test City','Test Country',83.20645590809977,124.2451080674705,'2025-05-20 16:11:39.341','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('463cc3d1-564b-4f4d-89be-2e5b9fe4e749','::1','localhost','Other','Test City','Test Country',-25.21040652700295,-125.1659856344658,'2026-01-07 01:57:25.921','/shop',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('46710466-258f-4c13-9c27-f0155f64c898','::1','localhost','Other','Test City','Test Country',-5.768122034035216,14.43962141156598,'2025-05-20 15:53:16.315','/admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('4a219089-a044-4e9b-88ee-5d9ec717da2d','::1','mail.google.com','Organic Search','Test City','Test Country',-54.47355966150461,55.91857421107755,'2025-05-20 15:48:04.639','/contact',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('4d5d2dde-3c19-4c17-ba31-065df3982b54','::1','localhost','Other','Test City','Test Country',39.78418919833865,-51.08974437600898,'2025-05-20 15:54:42.355','/admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('4e84a961-b884-4a1d-8862-ab899b5eac32','::1','localhost','Other','Test City','Test Country',-49.24049487323999,-135.4187943281484,'2025-05-22 22:52:13.262','/product/mario-pinto-10-and-0-undefeated-tee',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('4f369a46-4f96-4499-ac6a-3e3c6b85ffaf','::1','localhost','Other','Test City','Test Country',69.98677582135855,-109.1945632161557,'2026-01-06 13:35:06.182','/weekly-pack',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('516cd22f-0c99-4957-827a-fea9cbc8dce6','::1','localhost','Other','Test City','Test Country',79.83617493005593,17.80223600998136,'2026-01-07 15:53:06.320','/download/test_session_123',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('51bbcef0-0e79-4f21-ac04-76bd068f199b','::1','localhost','Other','Test City','Test Country',68.00796426900678,-83.2429657302704,'2025-05-22 15:37:59.614','/blog',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('53cdbf25-8d27-4a02-bf09-666b9e119532','::1','youtube.com','Social Media','Test City','Test Country',-88.23414960854433,-81.79935505107382,'2025-05-20 15:48:05.150','/pricing',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('5611d680-9ae2-4c4a-b726-8f00284a8c68','::1','localhost','Other','Test City','Test Country',-27.56013014145483,-81.16148921714381,'2026-01-07 00:07:18.870','/product/printable-deluxe-biscuit-picture',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('563cb2b4-bec6-4012-b590-5ca3eb86f840','::1','localhost','Other','Test City','Test Country',-14.79056129857206,-100.5587293612599,'2026-01-07 01:25:25.410','/product/printable-deluxe-biscuit-picture',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('5716b4b2-3cae-43bf-bfef-f1ad690ac5bf','::1','localhost','Other','Test City','Test Country',-56.71632777963351,-95.47746680840348,'2026-01-06 13:42:18.836','/weekly-pack',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('5aea6e77-7581-461a-a9fd-3b0e551c099b','::1','localhost','Other','Test City','Test Country',85.02535258918965,4.836684529632606,'2026-01-07 16:32:23.860','/download/cs_test_a1w2fFg56MBrW4MNZ47BQ92KAV5nofP2V5Rtq6MJiTvchS46YAQbHiN1DB',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('5b3c3af8-670a-4bc7-a90f-16c6fb54ba58','::1','localhost','Other','Test City','Test Country',-45.51268882576518,-39.42673316274454,'2025-05-20 15:57:22.914','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('5d70c41a-3b7a-4206-a774-787c2bbde03f','::1','localhost','Other','Test City','Test Country',36.18627391835959,74.02755887074079,'2026-01-07 00:00:44.406','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('5dd8d53a-66b4-4aad-ad1b-6ca6b9600340','::1','localhost','Other','Test City','Test Country',82.69741292239351,-165.9568083745088,'2025-05-20 15:55:45.976','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('604afb08-b2e4-4ea5-8b9c-66956155b3fe','::1','localhost','Other','Test City','Test Country',57.65918246042381,-54.60200646372219,'2026-01-07 17:16:46.003','/cart',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('60c9e93f-6c7b-4d22-8b27-779f322ba118','::1','localhost','Other','Test City','Test Country',85.44362904903923,-167.1154795161768,'2026-01-06 17:29:25.713','/profile/edit',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('61ad80b9-7f61-40e5-b406-ceec4f1f67f3','::1','localhost','Other','Test City','Test Country',72.9140435429891,-37.67889689446278,'2026-01-07 01:10:47.824','/shop',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('64ceacac-1b44-48c7-aec9-375809c75f73','::1','localhost','Other','Test City','Test Country',-87.28821916428997,144.5578041625196,'2025-05-22 22:52:50.516','/product/mario-pinto-10-and-0-undefeated-tee',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('6507de90-0181-4ce4-9801-be91c420f70e','::1','localhost','Other','Test City','Test Country',-12.24561913250109,-137.2596657423279,'2026-01-07 01:39:00.435','/product/printable-deluxe-biscuit-picture',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('69ba8781-355d-49ed-bbeb-2e3e69dece08','::1','localhost','Other','Test City','Test Country',-67.40304775699943,52.60824478769695,'2026-01-06 03:01:43.899','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('6d5d2308-3419-46e1-87b0-d53bf9bca515','::1','localhost','Other','Test City','Test Country',-82.98174541186262,43.59013320968484,'2025-05-20 16:37:38.940','/blog/rethinking-game-theory',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('6d751908-696f-4cef-bff2-010afb9c0e2b','::1','localhost','Other','Test City','Test Country',-13.29826579413717,-107.8607926769437,'2025-05-20 15:54:39.392','/admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('70cc5396-45f0-4865-8913-a0c1c921c45f','::1','localhost','Other','Test City','Test Country',-56.43842789384909,11.58112693289405,'2026-01-07 01:28:59.839','/product/printable-deluxe-biscuit-picture',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('712db0d5-6a36-4391-91d4-24d0038b0dd4','::1','localhost','Other','Test City','Test Country',15.16337630652026,132.4862211158252,'2026-01-07 16:17:04.881','/download/cs_test_a1w2fFg56MBrW4MNZ47BQ92KAV5nofP2V5Rtq6MJiTvchS46YAQbHiN1DB',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('7206a3cb-22f2-4ffd-9b52-af2d60c4a1a6','::1','localhost','Other','Test City','Test Country',48.24263777961133,-123.3284796579632,'2025-05-20 15:53:33.560','/admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('75ace855-9d98-49c8-9885-d45a53f72050','::1','localhost','Other','Test City','Test Country',67.11075614127185,-110.0522003081084,'2026-01-07 00:41:38.445','/shop',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('7903639f-3abc-4609-900c-a31f03aaff6b','::1','localhost','Other','Test City','Test Country',-28.81641963046325,27.61502805517927,'2026-01-06 13:33:35.003','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('7b32b5c4-baf4-4476-bc61-90b8a1806c5c','::1','facebook.com','Social Media','Test City','Test Country',88.90822552630664,-23.64593716778455,'2025-05-20 15:48:07.192','/blog/top-10-web-design-trends',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('7bacdc49-1734-4805-b02e-f093e92eb4c5','::1','localhost','Other','Test City','Test Country',70.84103634337663,-47.1604595448222,'2026-01-07 01:40:41.563','/product/printable-deluxe-biscuit-picture',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('7c05f926-b66f-471d-89da-db4cc8e189cb','::1','localhost','Other','Test City','Test Country',-70.87766921514984,3.828293933888801,'2025-05-20 15:53:19.613','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('7d243f12-c4d4-4209-ba83-18e6c1e2725b','::1','localhost','Other','Test City','Test Country',-84.5924699760346,-108.0852578595228,'2026-01-07 00:21:34.841','/shop',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('7d28ea09-f4df-4f4b-be20-4411f7dd96ca','::1','localhost','Other','Test City','Test Country',-46.77826362197791,139.1937480656648,'2025-05-20 15:57:03.616','/admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('80397bf8-d374-437d-9803-c85abccf3daa','::1','localhost','Other','Test City','Test Country',64.00175109336527,-159.6206316528343,'2026-01-06 13:32:45.668','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('804a9f1e-cb8c-4d49-8fac-878c818024ad','::1','localhost','Other','Test City','Test Country',41.88019111473039,-25.74935174185543,'2025-05-20 15:53:23.080','/admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('80b4cc36-4173-497a-be54-52850ff073b7','::1','localhost','Other','Test City','Test Country',32.5935535541351,-73.15367953679198,'2025-05-20 15:53:23.079','/admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('81d4a932-322e-4a95-8180-5637534f0754','::1','localhost','Other','Test City','Test Country',88.45322652245358,120.5361066770399,'2026-01-07 16:25:37.545','/download/cs_test_a1w2fFg56MBrW4MNZ47BQ92KAV5nofP2V5Rtq6MJiTvchS46YAQbHiN1DB',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('832f94ae-7cd4-4e0b-ba97-fb29acbb5f3c','::1','localhost','Other','Test City','Test Country',59.8463275764085,109.8209437050887,'2025-05-20 15:53:33.560','/admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('875e7d15-e6e0-41fe-8b78-79e41f66d67e','127.0.0.1','google.com','Search',NULL,NULL,NULL,NULL,'2025-05-20 13:57:46.039',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('8b25afcc-bb0b-4796-abb7-9adb26725077','::1','reddit.com','Social Media','Test City','Test Country',-80.9210741555857,-8.678048373912418,'2025-05-20 15:48:11.307','/blog/how-to-optimize-your-website',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('92a508fc-b797-4a20-8e31-5bcfe9934220','::1','localhost','Other','Test City','Test Country',11.48703777959277,154.5727560628007,'2026-01-07 01:28:01.721','/product/printable-deluxe-biscuit-picture',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('92b1c5d2-18a7-4fa2-92e1-400f571bf17f','::1','localhost','Other','Test City','Test Country',-56.4404117612814,163.0053569419496,'2026-01-07 16:25:08.866','/download/cs_test_a1w2fFg56MBrW4MNZ47BQ92KAV5nofP2V5Rtq6MJiTvchS46YAQbHiN1DB',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('940de2e8-6413-4f8f-b420-dcb9a67df5ef','::1','bing.com','Organic Search','Test City','Test Country',-52.92000323828221,50.907351664424,'2025-05-20 15:48:10.797','/features',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('96aa1bb8-bfca-4aa7-a7d0-f87a691c65c5','::1','bing.com','Organic Search','Test City','Test Country',85.52123007569145,120.6283741765577,'2025-05-20 15:48:10.269','/about',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('96fa49ea-f359-4ed0-b3b0-13da9e7a21c9','::1','localhost','Other','Test City','Test Country',-40.24819642694312,-9.00038830578319,'2026-01-07 13:27:33.901','/product/printable-deluxe-biscuit-picture',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('992ca4a1-c52c-4ae0-b8f6-2a3756eb82ff','127.0.0.1','google.com','Search',NULL,NULL,NULL,NULL,'2025-05-20 13:58:22.393',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('99f25364-0a39-4210-b8fb-69f13cb8acbc','::1','localhost','Other','Test City','Test Country',18.22972435152494,-80.16984931429859,'2026-01-07 02:29:42.510','/product/printable-deluxe-biscuit-picture',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('9a035b4e-3950-48d7-a25b-73d7fc4a1454','::1','localhost','Other','Test City','Test Country',-6.268985319611758,-40.69316880920769,'2026-01-07 16:19:13.281','/download/cs_test_a1w2fFg56MBrW4MNZ47BQ92KAV5nofP2V5Rtq6MJiTvchS46YAQbHiN1DB',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('9a25dcc9-0636-4a75-891a-81ee79aaf3f6','::1','localhost','Other','Test City','Test Country',54.30534159806811,-57.49929556009191,'2026-01-07 15:51:50.723','/download/test_session_123',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('9a62af40-9f98-46da-a5ef-acebe89097c2','::1','localhost','Other','Test City','Test Country',62.53875775404873,-162.4337756726851,'2026-01-07 01:11:01.453','/shop',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('9bad8f1b-e9d6-46c1-99f6-f4881bc5f8de','::1','localhost','Other','Test City','Test Country',27.05071114521682,144.6090723265258,'2026-01-06 17:28:17.529','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('a0aaeb8b-cfd2-4790-94ef-6b20085254ce','::1','localhost','Other','Test City','Test Country',-54.90870691398307,161.814009663557,'2025-05-20 15:55:14.781','/admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('a21b513f-a33e-4351-8446-d17b7fa15cef','::1','example.com','Other','Test City','Test Country',81.00791021103879,-150.6808356411505,'2025-05-20 15:45:40.511','/test',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('a53bb32f-0576-4c16-90dd-8a7a9284a73e','::1','localhost','Other','Test City','Test Country',41.98142843179625,-28.71590803383,'2026-01-06 13:31:28.242','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('a7539d1a-1c70-459b-a124-3238e0ee614e','::1','localhost','Other','Test City','Test Country',72.42543124855104,164.0338799900336,'2025-05-20 16:02:15.687','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('acd2a5f2-95d2-476d-a1c2-02b8cd927b3d','::1','localhost','Other','Test City','Test Country',-69.62115394468408,1.489962067009174,'2026-01-06 13:42:20.885','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('ad75cc6d-d750-4850-b063-c2910e20ff0b','::1','localhost','Other','Test City','Test Country',-57.95178683083002,-35.61005941778848,'2026-01-06 13:35:24.029','/quiz-database',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('adfe8c58-4ba2-4350-9ccc-778c2724496b','::1','localhost','Other','Test City','Test Country',72.44057189415165,179.2697150183452,'2026-01-07 16:14:20.329','/download/test_session_123',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('af0f4134-0878-4dbb-9886-146028bfe32d','::1','linkedin.com','Social Media','Test City','Test Country',-37.6063306930001,-118.3284466960677,'2025-05-20 15:48:06.684','/about',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('afd96f99-f226-458f-be94-da00d5010de9','::1','twitter.com','Social Media','Test City','Test Country',27.63960218089345,1.816236346470703,'2025-05-20 15:48:11.821','/blog/top-10-web-design-trends',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('b085a055-464d-41f3-8285-d495af186cd1','::1','localhost','Other','Test City','Test Country',-36.29805917612706,-64.30033442417297,'2025-05-20 15:53:19.613','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('b29926f9-c6c7-47e8-9527-15d985ce15fc','::1','localhost','Other','Test City','Test Country',30.84889423526491,-127.9922576340015,'2026-01-07 00:02:15.499','/product/printable-deluxe-biscuit-picture',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('b2f0aeec-5291-4351-ac7b-b14a0a782d09','::1','localhost','Other','Test City','Test Country',-12.67337042068056,52.930930449594,'2026-01-07 00:13:34.299','/shop',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('b5fa9f00-a127-4890-8bbe-d27d2d3f2eb7','::1','localhost','Other','Test City','Test Country',-70.48630324537658,-13.0760990218196,'2026-01-06 03:00:22.519','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('b99a1abb-773a-445b-b802-2c8c915f1328','::1','localhost','Other','Test City','Test Country',1.457399753100972,-126.0972860056772,'2026-01-07 17:38:23.033','/shop',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('bb0069ac-8009-4294-8e9a-883722d6ea08','::1','google.com','Organic Search','Test City','Test Country',1.44564136965522,93.27499959662526,'2025-05-20 15:48:05.662','/features',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('c185f3c5-1ba7-462d-9c9f-e33265c6c744','::1','localhost','Other','Test City','Test Country',-82.67989146456253,-78.95029686858295,'2025-05-20 15:55:14.781','/admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('c1c1c554-3995-4e78-8a31-1c10e3c9814c','::1','localhost','Other','Test City','Test Country',-89.33848163582216,-113.3924826007833,'2025-05-20 15:53:16.317','/admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('c63a0210-b16a-4be4-b705-263ebf5c13d3','::1','localhost','Other','Test City','Test Country',68.66218099348183,-59.2283533619706,'2026-01-07 03:15:45.958','/product/printable-deluxe-biscuit-picture',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('c84ae191-8314-4daa-886a-ddbcb9cb06f8','::1','google.com','Organic Search','Test City','Test Country',44.13636174652623,150.4635628206948,'2025-05-20 15:48:09.245','/features',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('cc5f75ac-89e7-4a95-a132-0272b38c86c3','::1','localhost','Other','Test City','Test Country',75.70594343075095,98.76420060762626,'2026-01-07 00:19:17.208','/shop',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('cdc8cbe0-f211-4891-8cbc-b157cad256ea','::1','localhost','Other','Test City','Test Country',78.6192624545827,114.4854294944101,'2025-05-20 15:57:06.955','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('d17a97eb-a6f7-4a02-87dd-f6bcc1eabcc9','::1','localhost','Other','Test City','Test Country',64.13869989414962,167.1196087851882,'2026-01-07 01:13:59.848','/shop',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('d1a4a791-fa5a-4c81-b4bf-848b4098e428','::1','localhost','Other','Test City','Test Country',68.20900403394111,95.61805126402606,'2026-01-07 02:29:31.833','/product/printable-deluxe-biscuit-picture',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('d70b9826-7baf-422a-b6d1-b7a2083cef36','::1','localhost','Other','Test City','Test Country',89.65482602003027,-39.35522183312443,'2026-01-07 15:30:24.195','/download/test_session_123',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('d796f5e3-8c9b-4c68-b4e4-b620ddf23948','::1','localhost','Other','Test City','Test Country',-4.711668330641473,-115.2829502580889,'2025-05-20 16:37:10.416','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('d994c7c7-ec03-4fcc-9fd1-14608488bd94','::1','youtube.com','Social Media','Test City','Test Country',82.3033889560999,-110.1958921911626,'2025-05-20 15:48:03.615','/blog',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('dc1bc373-b875-43de-bb3f-9c62b7159887','::1','localhost','Other','Test City','Test Country',8.319498146107591,-174.4069712788329,'2025-05-20 15:53:36.027','/admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('dccc18c5-efa5-427f-99db-e7378cab4f79','::1','localhost','Other','Test City','Test Country',-58.15790157626328,-101.5131896801865,'2026-01-07 02:24:12.750','/product/printable-deluxe-biscuit-picture',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('deb581eb-25db-4c08-b450-8dae3a556178','::1','Direct','Direct','Test City','Test Country',-43.63374717107853,-14.76668626471235,'2025-05-20 15:48:08.731','/features',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('df16111b-85e0-4f70-9081-4bffaa69739d','::1','localhost','Other','Test City','Test Country',47.29706525215263,27.55545239951758,'2026-01-07 00:52:00.432','/shop',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('e31aaebb-828c-4007-9d3b-758f42b2517b','::1','localhost','Other','Test City','Test Country',57.97258514859192,150.4849186583381,'2025-05-22 15:29:26.624','/blog/rethinking-game-theory',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('e5595cdd-3230-4d7e-b7f3-cc33978d716f','::1','localhost','Other','Test City','Test Country',49.02085063237615,0.8459470164058018,'2026-01-07 00:17:30.429','/shop',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('e56f3833-462f-43db-a031-75f035ee21ba','::1','localhost','Other','Test City','Test Country',8.974551936520243,-15.46967335621653,'2025-05-20 15:55:03.535','/admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('e58f2ab2-44af-4137-9440-17f52be31cbc','::1','localhost','Other','Test City','Test Country',41.05214594536784,-56.277580944349,'2026-01-06 19:05:49.490','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('e5dc90be-1c8a-4095-8fc7-21128ff74cce','::1','localhost','Other','Test City','Test Country',77.05850829320724,-90.86736079863869,'2026-01-07 16:25:45.015','/download/cs_test_a1w2fFg56MBrW4MNZ47BQ92KAV5nofP2V5Rtq6MJiTvchS46YAQbHiN1DB',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('e7f90b99-03a2-408b-998d-d351d04a406b','::1','twitter.com','Social Media','Test City','Test Country',55.6177675576873,-20.03053031323864,'2025-05-20 15:48:08.218','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('ec62a4c9-3906-4a83-bcd4-e5cbd3e367e8','::1','mail.google.com','Organic Search','Test City','Test Country',-8.041157534248285,-24.42301694148793,'2025-05-20 15:48:07.705','/services',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('ee51d972-b67e-410e-bc00-4e01a4c02123','::1','localhost','Other','Test City','Test Country',-40.38899167151091,83.92096260091819,'2026-01-07 00:16:40.447','/shop',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('eee913b1-fc26-4a3f-819e-f8362f6603bc','::1','localhost','Other','Test City','Test Country',-12.30173311532059,-2.425495424131299,'2025-05-20 15:54:39.394','/admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('f06bea71-ffe6-4233-a680-f3c3f976a7a6','::1','localhost','Other','Test City','Test Country',51.24482850528932,23.29236328045542,'2026-01-07 16:25:53.029','/download/cs_test_a1w2fFg56MBrW4MNZ47BQ92KAV5nofP2V5Rtq6MJiTvchS46YAQbHiN1DB',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('f2d1f0ce-f5ef-477d-b9d5-8dcb404e77e3','::1','localhost','Other','Test City','Test Country',8.871325707731131,138.4181469898376,'2026-01-07 03:11:05.594','/product/printable-deluxe-biscuit-picture',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('f8196b62-64a6-4217-b83e-bb453d18db7a','::1','localhost','Other','Test City','Test Country',48.60497694183377,168.6984352309392,'2026-01-07 02:33:18.216','/product/printable-deluxe-biscuit-picture',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('f95d11b6-be4e-4587-af50-396cfc9ae0da','::1','localhost','Other','Test City','Test Country',-70.08972352223702,128.113464251271,'2025-05-20 15:57:08.628','/admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('f9629760-d4af-4042-ac0e-29fd0a537d87','::1','localhost','Other','Test City','Test Country',-22.39654157381946,5.336124793653511,'2025-05-20 15:55:03.535','/admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('fbc073a0-8cf6-4a91-9f43-1a0ab0122883','::1','localhost','Other','Test City','Test Country',63.54819616715264,148.2605605476848,'2025-05-20 15:55:45.975','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('fbd406de-dcff-463e-b94b-283bf55e02b3','::1','reddit.com','Social Media','Test City','Test Country',-69.59958535409804,-26.23574029515302,'2025-05-20 15:48:12.332','/contact',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('fc94b687-493e-46a4-82fe-c81b6383a105','::1','localhost','Other','Test City','Test Country',77.16306374021687,-168.1798588071703,'2026-01-06 03:01:47.111','/',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('fd64be1b-3d71-4e7a-a11e-0b24351f2fea','::1','localhost','Other','Test City','Test Country',-56.63249242283999,-56.80666311945171,'2026-01-06 13:37:44.787','/weekly-pack',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('fee2eca4-47ca-4e00-8243-30907edaf9f1','::1','localhost','Other','Test City','Test Country',23.36075486143969,178.8406439792906,'2026-01-07 13:23:19.616','/product/printable-deluxe-biscuit-picture',NULL,NULL,NULL,NULL,NULL,NULL,NULL),('ff34631f-f7cc-4f0f-be00-08c8c3cabaec','::1','localhost','Other','Test City','Test Country',-67.60902222296147,32.96067927916542,'2026-01-07 01:25:21.134','/product/printable-deluxe-biscuit-picture',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `Visitor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Vote`
--

DROP TABLE IF EXISTS `Vote`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Vote` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `commentId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Vote_userId_commentId_key` (`userId`,`commentId`),
  KEY `Vote_commentId_fkey` (`commentId`),
  KEY `Vote_userId_fkey` (`userId`),
  CONSTRAINT `Vote_commentId_fkey` FOREIGN KEY (`commentId`) REFERENCES `Comment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Vote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Vote`
--

LOCK TABLES `Vote` WRITE;
/*!40000 ALTER TABLE `Vote` DISABLE KEYS */;
INSERT INTO `Vote` VALUES ('3f9940c0-8012-4d28-8868-b5211cff9552','upvote','c39c7168-21ca-46ac-b37d-f9b4582bd5df','06284577-62f7-4a56-a856-d5134757cbd3','2025-05-19 13:26:38.171'),('cf838293-93d9-4441-a33a-6b1082fcf1b7','downvote','c39c7168-21ca-46ac-b37d-f9b4582bd5df','01466bc8-4fe4-412a-81b6-426c19f03638','2025-05-22 22:54:46.901');
/*!40000 ALTER TABLE `Vote` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Wishlist`
--

DROP TABLE IF EXISTS `Wishlist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Wishlist` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `productId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Wishlist_productId_fkey` (`productId`),
  KEY `Wishlist_userId_fkey` (`userId`),
  CONSTRAINT `Wishlist_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Wishlist_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Wishlist`
--

LOCK TABLES `Wishlist` WRITE;
/*!40000 ALTER TABLE `Wishlist` DISABLE KEYS */;
/*!40000 ALTER TABLE `Wishlist` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-07 20:06:52
