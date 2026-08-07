CREATE TABLE `ictChecks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clearanceId` int NOT NULL,
	`equipmentType` varchar(255) NOT NULL,
	`equipmentDescription` varchar(255),
	`status` enum('pending','returned','damaged','resolved') NOT NULL DEFAULT 'pending',
	`damageAmount` decimal(10,2),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ictChecks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `libraryBooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clearanceId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`bookNumber` varchar(64) NOT NULL,
	`isbn` varchar(20),
	`author` varchar(255),
	`fine` decimal(10,2),
	`status` enum('lost','damaged','pending','resolved') NOT NULL DEFAULT 'pending',
	`approvedAt` timestamp,
	`approvedBy` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `libraryBooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medicalChecks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clearanceId` int NOT NULL,
	`status` enum('pending','cleared','flagged') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medicalChecks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `registrarChecks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clearanceId` int NOT NULL,
	`status` enum('pending','cleared','flagged') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `registrarChecks_id` PRIMARY KEY(`id`)
);
