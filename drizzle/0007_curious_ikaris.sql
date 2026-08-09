CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`userRole` varchar(64),
	`userDepartment` varchar(64),
	`studentId` int,
	`action` varchar(255) NOT NULL,
	`department` varchar(64),
	`previousValue` text,
	`newValue` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departmentPasscodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role` enum('super_admin','finance','lab','sports','classroom','dorm','library','ict','medical','registrar') NOT NULL,
	`passcode` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `departmentPasscodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `departmentPasscodes_role_unique` UNIQUE(`role`)
);
--> statement-breakpoint
CREATE TABLE `finalClearances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clearanceId` int NOT NULL,
	`studentId` int NOT NULL,
	`clearedBy` int NOT NULL,
	`clearedAt` timestamp NOT NULL DEFAULT (now()),
	`certificateUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `finalClearances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reopenClearances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clearanceId` int NOT NULL,
	`studentId` int NOT NULL,
	`reopenedBy` int NOT NULL,
	`reason` text NOT NULL,
	`reopenedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reopenClearances_id` PRIMARY KEY(`id`)
);
