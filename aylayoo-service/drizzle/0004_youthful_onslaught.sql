CREATE TABLE `city_tours` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title_mn` text NOT NULL,
	`title_en` text NOT NULL,
	`summary_mn` text,
	`summary_en` text,
	`guide_id` integer NOT NULL,
	`duration_minutes` integer,
	`meeting_point_mn` text,
	`meeting_point_en` text,
	`stops` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`guide_id`) REFERENCES `guides`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `guide_consent` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guide_id` integer NOT NULL,
	`scope` text NOT NULL,
	`source` text NOT NULL,
	`recorded_by_admin_id` integer,
	`evidence_note` text NOT NULL,
	`recorded_at` integer DEFAULT (unixepoch()) NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`guide_id`) REFERENCES `guides`(`id`) ON UPDATE no action ON DELETE cascade
);
