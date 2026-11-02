CREATE TABLE `city_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title_mn` text NOT NULL,
	`title_en` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`place_mn` text,
	`place_en` text,
	`description_mn` text,
	`description_en` text,
	`link` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `city_food` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name_mn` text NOT NULL,
	`name_en` text NOT NULL,
	`category_mn` text,
	`category_en` text,
	`known_for_mn` text,
	`known_for_en` text,
	`area_mn` text,
	`area_en` text,
	`price_level` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `city_itineraries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title_mn` text NOT NULL,
	`title_en` text NOT NULL,
	`days` integer NOT NULL,
	`summary_mn` text,
	`summary_en` text,
	`stops` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `city_routes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title_mn` text NOT NULL,
	`title_en` text NOT NULL,
	`summary_mn` text,
	`summary_en` text,
	`stops` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `city_tips` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`topic` text NOT NULL,
	`title_mn` text NOT NULL,
	`title_en` text NOT NULL,
	`body_mn` text NOT NULL,
	`body_en` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `phrases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phrase_mn` text NOT NULL,
	`pronunciation` text NOT NULL,
	`meaning_en` text NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
