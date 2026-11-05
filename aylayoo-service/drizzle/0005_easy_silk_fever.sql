CREATE TABLE `trip_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reference` text NOT NULL,
	`traveller_name` text NOT NULL,
	`email` text,
	`phone` text,
	`message` text NOT NULL,
	`party_size` integer,
	`preferred_from` text,
	`preferred_to` text,
	`tour_id` integer,
	`guide_id` integer,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`accepted_at` integer,
	`closed_at` integer,
	`contact_cleared_at` integer,
	`review_token_hash` text,
	`review_token_delivered_at` integer,
	`review_token_used_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trip_requests_reference_unique` ON `trip_requests` (`reference`);