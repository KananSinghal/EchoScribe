CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`transcript` text NOT NULL,
	`audio_key` text NOT NULL,
	`original_filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`word_count` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notes_owner_created_idx` ON `notes` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `notes_owner_id_idx` ON `notes` (`owner_id`,`id`);