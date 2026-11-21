CREATE TABLE "protocol_cycle" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"source_protocol_id" text,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"planned_end_date" date NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"source_template_id" text,
	"source_template_version_id" text,
	"template_initially_matching" boolean DEFAULT false NOT NULL,
	"first_deviated_on" date,
	"ended_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "protocol_cycle_dates_check" CHECK ("protocol_cycle"."planned_end_date" >= "protocol_cycle"."start_date"),
	CONSTRAINT "protocol_cycle_status_check" CHECK ("protocol_cycle"."status" in ('active', 'paused', 'completed', 'cancelled')),
	CONSTRAINT "protocol_cycle_template_reference_check" CHECK ((
        "protocol_cycle"."source_template_id" is null
        and "protocol_cycle"."source_template_version_id" is null
        and "protocol_cycle"."template_initially_matching" = false
        and "protocol_cycle"."first_deviated_on" is null
      ) or (
        "protocol_cycle"."source_template_id" is not null
        and "protocol_cycle"."source_template_version_id" is not null
      )),
	CONSTRAINT "protocol_cycle_terminal_date_check" CHECK (("protocol_cycle"."status" in ('completed', 'cancelled')) = ("protocol_cycle"."ended_on" is not null))
);
--> statement-breakpoint
CREATE TABLE "protocol_cycle_pause" (
	"id" text PRIMARY KEY NOT NULL,
	"cycle_id" text NOT NULL,
	"paused_on" date NOT NULL,
	"resumed_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "protocol_cycle_pause_dates_check" CHECK ("protocol_cycle_pause"."resumed_on" is null or "protocol_cycle_pause"."resumed_on" >= "protocol_cycle_pause"."paused_on")
);
--> statement-breakpoint
CREATE TABLE "protocol_cycle_schedule_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"revision_id" text NOT NULL,
	"catalogue_entry_id" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "protocol_cycle_schedule_entry_position_check" CHECK ("protocol_cycle_schedule_entry"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "protocol_cycle_schedule_revision" (
	"id" text PRIMARY KEY NOT NULL,
	"cycle_id" text NOT NULL,
	"revision_number" integer NOT NULL,
	"effective_from" date NOT NULL,
	"template_schedule_matches" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "protocol_cycle_revision_number_check" CHECK ("protocol_cycle_schedule_revision"."revision_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "protocol_cycle_schedule_step" (
	"id" text PRIMARY KEY NOT NULL,
	"revision_entry_id" text NOT NULL,
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
	CONSTRAINT "protocol_cycle_schedule_step_dose_check" CHECK ("protocol_cycle_schedule_step"."dose_amount" > 0),
	CONSTRAINT "protocol_cycle_schedule_step_unit_check" CHECK (char_length("protocol_cycle_schedule_step"."dose_unit") between 1 and 20),
	CONSTRAINT "protocol_cycle_schedule_step_frequency_check" CHECK ("protocol_cycle_schedule_step"."frequency" in ('daily', 'weekly', 'interval_days')),
	CONSTRAINT "protocol_cycle_schedule_step_start_check" CHECK ("protocol_cycle_schedule_step"."start_day" > 0),
	CONSTRAINT "protocol_cycle_schedule_step_end_check" CHECK ("protocol_cycle_schedule_step"."end_day" >= "protocol_cycle_schedule_step"."start_day"),
	CONSTRAINT "protocol_cycle_schedule_step_position_check" CHECK ("protocol_cycle_schedule_step"."position" > 0)
);
--> statement-breakpoint
ALTER TABLE "protocol_cycle" ADD CONSTRAINT "protocol_cycle_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_cycle" ADD CONSTRAINT "protocol_cycle_source_protocol_id_member_protocol_id_fk" FOREIGN KEY ("source_protocol_id") REFERENCES "public"."member_protocol"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_cycle" ADD CONSTRAINT "protocol_cycle_source_version_fk" FOREIGN KEY ("source_template_id","source_template_version_id") REFERENCES "public"."protocol_template_version"("template_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_cycle_pause" ADD CONSTRAINT "protocol_cycle_pause_cycle_id_protocol_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."protocol_cycle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_cycle_schedule_entry" ADD CONSTRAINT "protocol_cycle_schedule_entry_revision_id_protocol_cycle_schedule_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."protocol_cycle_schedule_revision"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_cycle_schedule_entry" ADD CONSTRAINT "protocol_cycle_schedule_entry_catalogue_entry_id_catalogue_entry_id_fk" FOREIGN KEY ("catalogue_entry_id") REFERENCES "public"."catalogue_entry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_cycle_schedule_revision" ADD CONSTRAINT "protocol_cycle_schedule_revision_cycle_id_protocol_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."protocol_cycle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_cycle_schedule_step" ADD CONSTRAINT "protocol_cycle_schedule_step_revision_entry_id_protocol_cycle_schedule_entry_id_fk" FOREIGN KEY ("revision_entry_id") REFERENCES "public"."protocol_cycle_schedule_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "protocol_cycle_owner_idx" ON "protocol_cycle" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "protocol_cycle_status_idx" ON "protocol_cycle" USING btree ("status");--> statement-breakpoint
CREATE INDEX "protocol_cycle_pause_cycle_idx" ON "protocol_cycle_pause" USING btree ("cycle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "protocol_cycle_one_open_pause_unique" ON "protocol_cycle_pause" USING btree ("cycle_id") WHERE "protocol_cycle_pause"."resumed_on" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "protocol_cycle_schedule_entry_catalogue_unique" ON "protocol_cycle_schedule_entry" USING btree ("revision_id","catalogue_entry_id");--> statement-breakpoint
CREATE INDEX "protocol_cycle_schedule_entry_revision_idx" ON "protocol_cycle_schedule_entry" USING btree ("revision_id");--> statement-breakpoint
CREATE UNIQUE INDEX "protocol_cycle_revision_number_unique" ON "protocol_cycle_schedule_revision" USING btree ("cycle_id","revision_number");--> statement-breakpoint
CREATE UNIQUE INDEX "protocol_cycle_revision_effective_unique" ON "protocol_cycle_schedule_revision" USING btree ("cycle_id","effective_from");--> statement-breakpoint
CREATE INDEX "protocol_cycle_schedule_step_entry_idx" ON "protocol_cycle_schedule_step" USING btree ("revision_entry_id");