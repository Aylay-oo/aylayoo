PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_contact_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`message` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`guide_id` integer,
	`subject` text,
	`kind` text DEFAULT 'contact' NOT NULL
);
--> statement-breakpoint
-- Hand-corrected: drizzle-kit listed the newly added columns (phone, guide_id, subject,
-- kind) in the SELECT as well, but the old table has none of them. Copy only what exists;
-- the new columns take NULL, and `kind` takes its 'contact' default.
INSERT INTO `__new_contact_messages`("id", "name", "email", "message", "created_at") SELECT "id", "name", "email", "message", "created_at" FROM `contact_messages`;--> statement-breakpoint
DROP TABLE `contact_messages`;--> statement-breakpoint
ALTER TABLE `__new_contact_messages` RENAME TO `contact_messages`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_places` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`aimag_id` integer NOT NULL,
	`name_mn` text NOT NULL,
	`name_en` text NOT NULL,
	`description_mn` text,
	`description_en` text,
	`category` text NOT NULL,
	`lat` real,
	`lng` real,
	`images` text DEFAULT '[]' NOT NULL,
	`is_must_see` integer DEFAULT false NOT NULL,
	`image_key` text,
	`best_months_mn` text,
	`best_months_en` text,
	`must_title_mn` text,
	`must_title_en` text,
	`must_summary_mn` text,
	`must_summary_en` text,
	FOREIGN KEY (`aimag_id`) REFERENCES `aimags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- Hand-corrected for the same reason as contact_messages above: only the 11 original
-- columns are copied. lat/lng keep every existing value; they are merely nullable now.
INSERT INTO `__new_places`("id", "aimag_id", "name_mn", "name_en", "description_mn", "description_en", "category", "lat", "lng", "images", "is_must_see") SELECT "id", "aimag_id", "name_mn", "name_en", "description_mn", "description_en", "category", "lat", "lng", "images", "is_must_see" FROM `places`;--> statement-breakpoint
DROP TABLE `places`;--> statement-breakpoint
ALTER TABLE `__new_places` RENAME TO `places`;--> statement-breakpoint
ALTER TABLE `aimags` ADD `iso_code` text;--> statement-breakpoint
ALTER TABLE `aimags` ADD `center_mn` text;--> statement-breakpoint
ALTER TABLE `aimags` ADD `center_en` text;--> statement-breakpoint
ALTER TABLE `aimags` ADD `area_km2` real;--> statement-breakpoint
CREATE UNIQUE INDEX `aimags_iso_code_unique` ON `aimags` (`iso_code`);--> statement-breakpoint
ALTER TABLE `guides` ADD `experience_years` integer;--> statement-breakpoint
ALTER TABLE `guides` ADD `route_mn` text;--> statement-breakpoint
ALTER TABLE `guides` ADD `route_en` text;--> statement-breakpoint
ALTER TABLE `guides` ADD `car` text;--> statement-breakpoint
ALTER TABLE `guides` ADD `rating` real;--> statement-breakpoint
ALTER TABLE `guides` ADD `review_count` integer;--> statement-breakpoint
ALTER TABLE `team_members` ADD `name_en` text;--> statement-breakpoint
ALTER TABLE `team_members` ADD `role_en` text;--> statement-breakpoint
ALTER TABLE `team_members` ADD `school_mn` text;--> statement-breakpoint
ALTER TABLE `team_members` ADD `school_en` text;--> statement-breakpoint
ALTER TABLE `team_members` ADD `description_mn` text;--> statement-breakpoint
ALTER TABLE `team_members` ADD `description_en` text;