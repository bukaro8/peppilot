CREATE TABLE "member_protocol" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"duration_days" integer NOT NULL,
	"origin" text NOT NULL,
	"source_template_id" text,
	"source_template_version_id" text,
	"template_schedule_unchanged" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_protocol_duration_check" CHECK ("member_protocol"."duration_days" > 0),
	CONSTRAINT "member_protocol_status_check" CHECK ("member_protocol"."status" = 'draft'),
	CONSTRAINT "member_protocol_origin_check" CHECK ("member_protocol"."origin" in ('custom', 'template')),
	CONSTRAINT "member_protocol_provenance_check" CHECK ((
        "member_protocol"."origin" = 'custom'
        and "member_protocol"."source_template_id" is null
        and "member_protocol"."source_template_version_id" is null
        and "member_protocol"."template_schedule_unchanged" = false
      ) or (
        "member_protocol"."origin" = 'template'
        and "member_protocol"."source_template_id" is not null
        and "member_protocol"."source_template_version_id" is not null
      ))
);
--> statement-breakpoint
CREATE TABLE "member_protocol_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"protocol_id" text NOT NULL,
	"catalogue_entry_id" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "member_protocol_entry_position_check" CHECK ("member_protocol_entry"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "member_protocol_schedule_step" (
	"id" text PRIMARY KEY NOT NULL,
	"protocol_entry_id" text NOT NULL,
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
	CONSTRAINT "member_protocol_schedule_step_dose_check" CHECK ("member_protocol_schedule_step"."dose_amount" > 0),
	CONSTRAINT "member_protocol_schedule_step_unit_check" CHECK (char_length("member_protocol_schedule_step"."dose_unit") between 1 and 20),
	CONSTRAINT "member_protocol_schedule_step_frequency_check" CHECK ("member_protocol_schedule_step"."frequency" in ('daily', 'weekly', 'interval_days')),
	CONSTRAINT "member_protocol_schedule_step_start_check" CHECK ("member_protocol_schedule_step"."start_day" > 0),
	CONSTRAINT "member_protocol_schedule_step_end_check" CHECK ("member_protocol_schedule_step"."end_day" >= "member_protocol_schedule_step"."start_day"),
	CONSTRAINT "member_protocol_schedule_step_position_check" CHECK ("member_protocol_schedule_step"."position" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "protocol_template_version_template_id_unique" ON "protocol_template_version" USING btree ("template_id","id");--> statement-breakpoint
ALTER TABLE "member_protocol" ADD CONSTRAINT "member_protocol_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_protocol" ADD CONSTRAINT "member_protocol_source_version_fk" FOREIGN KEY ("source_template_id","source_template_version_id") REFERENCES "public"."protocol_template_version"("template_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_protocol_entry" ADD CONSTRAINT "member_protocol_entry_protocol_id_member_protocol_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."member_protocol"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_protocol_entry" ADD CONSTRAINT "member_protocol_entry_catalogue_entry_id_catalogue_entry_id_fk" FOREIGN KEY ("catalogue_entry_id") REFERENCES "public"."catalogue_entry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_protocol_schedule_step" ADD CONSTRAINT "member_protocol_schedule_step_protocol_entry_id_member_protocol_entry_id_fk" FOREIGN KEY ("protocol_entry_id") REFERENCES "public"."member_protocol_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_protocol_owner_idx" ON "member_protocol" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "member_protocol_source_version_idx" ON "member_protocol" USING btree ("source_template_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_protocol_entry_catalogue_unique" ON "member_protocol_entry" USING btree ("protocol_id","catalogue_entry_id");--> statement-breakpoint
CREATE INDEX "member_protocol_entry_protocol_idx" ON "member_protocol_entry" USING btree ("protocol_id");--> statement-breakpoint
CREATE INDEX "member_protocol_schedule_step_entry_idx" ON "member_protocol_schedule_step" USING btree ("protocol_entry_id");
