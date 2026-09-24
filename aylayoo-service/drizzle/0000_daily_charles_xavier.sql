CREATE TABLE `admins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admins_email_unique` ON `admins` (`email`);--> statement-breakpoint
CREATE TABLE `aimags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name_mn` text NOT NULL,
	`name_en` text NOT NULL,
	`region` text,
	`description_mn` text,
	`description_en` text,
	`image_url` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `aimags_slug_unique` ON `aimags` (`slug`);--> statement-breakpoint
CREATE TABLE `contact_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `facts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title_mn` text NOT NULL,
	`title_en` text NOT NULL,
	`body_mn` text NOT NULL,
	`body_en` text NOT NULL,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `guide_aimags` (
	`guide_id` integer NOT NULL,
	`aimag_id` integer NOT NULL,
	PRIMARY KEY(`guide_id`, `aimag_id`),
	FOREIGN KEY (`guide_id`) REFERENCES `guides`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`aimag_id`) REFERENCES `aimags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `guides` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`bio_mn` text,
	`bio_en` text,
	`languages` text DEFAULT '[]' NOT NULL,
	`trip_types` text DEFAULT '[]' NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`photo_url` text,
	`website` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `places` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`aimag_id` integer NOT NULL,
	`name_mn` text NOT NULL,
	`name_en` text NOT NULL,
	`description_mn` text,
	`description_en` text,
	`category` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`images` text DEFAULT '[]' NOT NULL,
	`is_must_see` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`aimag_id`) REFERENCES `aimags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`photo_url` text,
	`sort_order` integer DEFAULT 0 NOT NULL
);
