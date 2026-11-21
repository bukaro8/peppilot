CREATE TABLE "protocol_template" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "protocol_template_slug_unique" UNIQUE("slug"),
	CONSTRAINT "protocol_template_slug_check" CHECK ("protocol_template"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "protocol_template_schedule_step" (
	"id" text PRIMARY KEY NOT NULL,
	"version_entry_id" text NOT NULL,
	"dose_amount" numeric(12, 4) NOT NULL,
	"dose_unit" text NOT NULL,
	"frequency" text NOT NULL,
	"days_of_week" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"interval_days" integer,
	"time_of_day" time,
	"start_day" integer DEFAULT 1 NOT NULL,
	"end_day" integer NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "protocol_template_schedule_step_dose_check" CHECK ("protocol_template_schedule_step"."dose_amount" > 0),
	CONSTRAINT "protocol_template_schedule_step_unit_check" CHECK (char_length("protocol_template_schedule_step"."dose_unit") between 1 and 20),
	CONSTRAINT "protocol_template_schedule_step_frequency_check" CHECK ("protocol_template_schedule_step"."frequency" in ('daily', 'weekly', 'interval_days')),
	CONSTRAINT "protocol_template_schedule_step_start_check" CHECK ("protocol_template_schedule_step"."start_day" > 0),
	CONSTRAINT "protocol_template_schedule_step_end_check" CHECK ("protocol_template_schedule_step"."end_day" >= "protocol_template_schedule_step"."start_day"),
	CONSTRAINT "protocol_template_schedule_step_position_check" CHECK ("protocol_template_schedule_step"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "protocol_template_version" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"duration_days" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"published_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "protocol_template_version_number_check" CHECK ("protocol_template_version"."version_number" > 0),
	CONSTRAINT "protocol_template_version_duration_check" CHECK ("protocol_template_version"."duration_days" > 0),
	CONSTRAINT "protocol_template_version_status_check" CHECK ("protocol_template_version"."status" in ('draft', 'published', 'retired'))
);
--> statement-breakpoint
CREATE TABLE "protocol_template_version_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"version_id" text NOT NULL,
	"catalogue_entry_id" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "protocol_template_version_entry_position_check" CHECK ("protocol_template_version_entry"."position" > 0)
);
--> statement-breakpoint
ALTER TABLE "protocol_template" ADD CONSTRAINT "protocol_template_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_template_schedule_step" ADD CONSTRAINT "protocol_template_schedule_step_version_entry_id_protocol_template_version_entry_id_fk" FOREIGN KEY ("version_entry_id") REFERENCES "public"."protocol_template_version_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_template_version" ADD CONSTRAINT "protocol_template_version_template_id_protocol_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."protocol_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_template_version" ADD CONSTRAINT "protocol_template_version_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_template_version_entry" ADD CONSTRAINT "protocol_template_version_entry_version_id_protocol_template_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."protocol_template_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_template_version_entry" ADD CONSTRAINT "protocol_template_version_entry_catalogue_entry_id_catalogue_entry_id_fk" FOREIGN KEY ("catalogue_entry_id") REFERENCES "public"."catalogue_entry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "protocol_template_schedule_step_entry_idx" ON "protocol_template_schedule_step" USING btree ("version_entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "protocol_template_version_number_unique" ON "protocol_template_version" USING btree ("template_id","version_number");--> statement-breakpoint
CREATE INDEX "protocol_template_version_status_idx" ON "protocol_template_version" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "protocol_template_version_entry_catalogue_unique" ON "protocol_template_version_entry" USING btree ("version_id","catalogue_entry_id");--> statement-breakpoint
CREATE INDEX "protocol_template_version_entry_version_idx" ON "protocol_template_version_entry" USING btree ("version_id");