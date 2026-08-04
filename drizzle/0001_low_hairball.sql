CREATE TABLE `classroomChecks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clearanceId` int NOT NULL,
	`itemName` varchar(255) NOT NULL,
	`damageAmount` decimal(10,2) NOT NULL,
	`description` text,
	`resolved` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `classroomChecks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clearances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`status` enum('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
	`initiatedBy` int,
	`initiatedAt` timestamp,
	`completedAt` timestamp,
	`certificateUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clearances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departmentSignOffs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clearanceId` int NOT NULL,
	`department` enum('finance','lab','sports','classroom','dorm') NOT NULL,
	`status` enum('pending','approved','flagged') NOT NULL DEFAULT 'pending',
	`signedOffBy` int,
	`signedOffAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `departmentSignOffs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dormChecks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clearanceId` int NOT NULL,
	`itemName` varchar(255) NOT NULL,
	`damageAmount` decimal(10,2) NOT NULL,
	`description` text,
	`resolved` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dormChecks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financeChecks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clearanceId` int NOT NULL,
	`outstandingBalance` decimal(10,2) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financeChecks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `labChecks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clearanceId` int NOT NULL,
	`equipmentName` varchar(255) NOT NULL,
	`damageAmount` decimal(10,2) NOT NULL,
	`description` text,
	`resolved` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `labChecks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sportsChecks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clearanceId` int NOT NULL,
	`equipmentName` varchar(255) NOT NULL,
	`quantity` int NOT NULL,
	`returned` boolean NOT NULL DEFAULT false,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sportsChecks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`program` varchar(255) NOT NULL,
	`graduationYear` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `students_id` PRIMARY KEY(`id`),
	CONSTRAINT `students_studentId_unique` UNIQUE(`studentId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','finance','lab','sports','classroom','dorm') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `department` varchar(64);