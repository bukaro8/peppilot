CREATE TABLE "injection_record" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"cycle_id" text NOT NULL,
	"scheduled_occurrence_id" text NOT NULL,
	"schedule_revision_id" text NOT NULL,
	"schedule_step_id" text NOT NULL,
	"catalogue_entry_id" text NOT NULL,
	"scheduled_date" date NOT NULL,
	"scheduled_time" time,
	"scheduled_dose_amount" numeric(12, 4) NOT NULL,
	"scheduled_dose_unit" text NOT NULL,
	"status" text NOT NULL,
	"actual_date" date,
	"actual_time" time,
	"actual_dose_amount" numeric(12, 4),
	"actual_dose_unit" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "injection_record_status_check" CHECK ("injection_record"."status" in ('completed', 'skipped', 'missed')),
	CONSTRAINT "injection_record_scheduled_unit_check" CHECK (char_length("injection_record"."scheduled_dose_unit") between 1 and 20),
	CONSTRAINT "injection_record_scheduled_dose_check" CHECK ("injection_record"."scheduled_dose_amount" > 0),
	CONSTRAINT "injection_record_notes_check" CHECK ("injection_record"."notes" is null or char_length("injection_record"."notes") <= 1000),
	CONSTRAINT "injection_record_actual_fields_check" CHECK ((
        "injection_record"."status" = 'completed'
        and "injection_record"."actual_date" is not null
        and "injection_record"."actual_time" is not null
        and "injection_record"."actual_dose_amount" > 0
        and char_length("injection_record"."actual_dose_unit") between 1 and 20
      ) or (
        "injection_record"."status" in ('skipped', 'missed')
        and "injection_record"."actual_date" is null
        and "injection_record"."actual_time" is null
        and "injection_record"."actual_dose_amount" is null
        and "injection_record"."actual_dose_unit" is null
      ))
);
--> statement-breakpoint
CREATE TABLE "injection_record_history" (
	"id" text PRIMARY KEY NOT NULL,
	"injection_record_id" text NOT NULL,
	"previous_status" text NOT NULL,
	"previous_actual_date" date,
	"previous_actual_time" time,
	"previous_actual_dose_amount" numeric(12, 4),
	"previous_actual_dose_unit" text,
	"previous_notes" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "injection_record" ADD CONSTRAINT "injection_record_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "injection_record" ADD CONSTRAINT "injection_record_cycle_id_protocol_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."protocol_cycle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "injection_record" ADD CONSTRAINT "injection_record_schedule_revision_id_protocol_cycle_schedule_revision_id_fk" FOREIGN KEY ("schedule_revision_id") REFERENCES "public"."protocol_cycle_schedule_revision"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "injection_record" ADD CONSTRAINT "injection_record_schedule_step_id_protocol_cycle_schedule_step_id_fk" FOREIGN KEY ("schedule_step_id") REFERENCES "public"."protocol_cycle_schedule_step"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "injection_record" ADD CONSTRAINT "injection_record_catalogue_entry_id_catalogue_entry_id_fk" FOREIGN KEY ("catalogue_entry_id") REFERENCES "public"."catalogue_entry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "injection_record_history" ADD CONSTRAINT "injection_record_history_injection_record_id_injection_record_id_fk" FOREIGN KEY ("injection_record_id") REFERENCES "public"."injection_record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "injection_record_occurrence_unique" ON "injection_record" USING btree ("scheduled_occurrence_id");--> statement-breakpoint
CREATE INDEX "injection_record_owner_date_idx" ON "injection_record" USING btree ("owner_user_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "injection_record_cycle_idx" ON "injection_record" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "injection_record_history_record_idx" ON "injection_record_history" USING btree ("injection_record_id");