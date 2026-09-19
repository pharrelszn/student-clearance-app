DROP TABLE `registrarChecks`;--> statement-breakpoint
ALTER TABLE `departmentPasscodes` MODIFY COLUMN `role` enum('super_admin','finance','lab','sports','classroom','dorm','library','ict','medical') NOT NULL;--> statement-breakpoint
ALTER TABLE `departmentSignOffs` MODIFY COLUMN `department` enum('finance','lab','sports','classroom','dorm','library','ict','medical') NOT NULL;