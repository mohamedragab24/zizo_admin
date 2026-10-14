CREATE TABLE `salon_bookings` (
	`id` varchar(64) NOT NULL,
	`bookingCode` varchar(24) NOT NULL,
	`customerName` varchar(160) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`bookingDate` varchar(10) NOT NULL,
	`bookingTime` varchar(20) NOT NULL,
	`serviceItems` json NOT NULL,
	`status` enum('مؤكد','مكتمل','ملغي') NOT NULL DEFAULT 'مؤكد',
	`discountCode` varchar(40) NOT NULL DEFAULT '',
	`discountAmount` int NOT NULL DEFAULT 0,
	`queueAhead` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `salon_bookings_id` PRIMARY KEY(`id`),
	CONSTRAINT `salon_bookings_bookingCode_unique` UNIQUE(`bookingCode`)
);
--> statement-breakpoint
CREATE TABLE `salon_customers` (
	`id` varchar(64) NOT NULL,
	`name` varchar(160) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`visits` int NOT NULL DEFAULT 0,
	`blocked` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `salon_customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `salon_customers_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `salon_discounts` (
	`id` varchar(64) NOT NULL,
	`code` varchar(40) NOT NULL,
	`kind` enum('percent','fixed') NOT NULL,
	`value` int NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`uses` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `salon_discounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `salon_discounts_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `salon_settings` (
	`id` varchar(40) NOT NULL,
	`country` varchar(2) NOT NULL DEFAULT 'EG',
	`currency` varchar(3) NOT NULL DEFAULT 'EGP',
	`shopOpen` boolean NOT NULL DEFAULT true,
	`hours` json NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `salon_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `salon_services` (
	`id` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text NOT NULL,
	`price` int NOT NULL,
	`duration` int NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`icon` varchar(24) NOT NULL DEFAULT 'cut',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `salon_services_id` PRIMARY KEY(`id`)
);
