CREATE TABLE `evidence_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`input` text NOT NULL,
	`evidence` text NOT NULL,
	`created_at` integer NOT NULL
);
