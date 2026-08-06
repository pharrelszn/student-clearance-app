CREATE TABLE `adminConfigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`enableSports` boolean NOT NULL DEFAULT false,
	`enableDorm` boolean NOT NULL DEFAULT false,
	`enableLab` boolean NOT NULL DEFAULT false,
	`enableClassroom` boolean NOT NULL DEFAULT false,
	`enableFinance` boolean NOT NULL DEFAULT false,
	`configuredAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `adminConfigs_id` PRIMARY KEY(`id`)
);
