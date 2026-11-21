ALTER TABLE "user" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "bio" text;--> statement-breakpoint
CREATE UNIQUE INDEX "user_username_lower_unique" ON "user" USING btree (lower("username")) WHERE "user"."username" is not null;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_username_format_check" CHECK ("user"."username" is null or "user"."username" ~ '^[A-Za-z0-9_]{3,30}$');--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_display_name_length_check" CHECK ("user"."display_name" is null or char_length("user"."display_name") between 1 and 60);--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_bio_length_check" CHECK ("user"."bio" is null or char_length("user"."bio") <= 280);
