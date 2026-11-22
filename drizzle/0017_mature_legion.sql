ALTER TABLE "member_protocol" DROP CONSTRAINT "member_protocol_duration_check";--> statement-breakpoint
ALTER TABLE "member_protocol" DROP CONSTRAINT "member_protocol_origin_check";--> statement-breakpoint
ALTER TABLE "member_protocol" DROP CONSTRAINT "member_protocol_provenance_check";--> statement-breakpoint
ALTER TABLE "member_protocol_schedule_step" DROP CONSTRAINT "member_protocol_schedule_step_frequency_check";--> statement-breakpoint
ALTER TABLE "member_protocol_schedule_step" DROP CONSTRAINT "member_protocol_schedule_step_end_check";--> statement-breakpoint
ALTER TABLE "protocol_cycle" DROP CONSTRAINT "protocol_cycle_dates_check";--> statement-breakpoint
ALTER TABLE "protocol_cycle_schedule_step" DROP CONSTRAINT "protocol_cycle_schedule_step_frequency_check";--> statement-breakpoint
ALTER TABLE "protocol_cycle_schedule_step" DROP CONSTRAINT "protocol_cycle_schedule_step_end_check";--> statement-breakpoint
ALTER TABLE "member_protocol" ALTER COLUMN "duration_days" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "member_protocol_schedule_step" ALTER COLUMN "end_day" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "protocol_cycle" ALTER COLUMN "planned_end_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "protocol_cycle_schedule_step" ALTER COLUMN "end_day" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "member_protocol" ADD COLUMN "duration_type" text DEFAULT 'fixed_cycle' NOT NULL;--> statement-breakpoint
ALTER TABLE "member_protocol" ADD COLUMN "source_approved_preset_id" text;--> statement-breakpoint
ALTER TABLE "member_protocol" ADD COLUMN "approved_definition" jsonb;--> statement-breakpoint
ALTER TABLE "member_protocol_schedule_step" ADD COLUMN "times_of_day" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "member_protocol_schedule_step" ADD COLUMN "administrations_per_day" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "member_protocol_schedule_step" ADD COLUMN "dose_basis" text DEFAULT 'single_compound_mass' NOT NULL;--> statement-breakpoint
ALTER TABLE "member_protocol_schedule_step" ADD COLUMN "ingredient_doses" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "member_protocol_schedule_step" ADD COLUMN "route" text;--> statement-breakpoint
ALTER TABLE "protocol_cycle" ADD COLUMN "duration_type" text DEFAULT 'fixed_cycle' NOT NULL;--> statement-breakpoint
ALTER TABLE "protocol_cycle" ADD COLUMN "approved_definition" jsonb;--> statement-breakpoint
ALTER TABLE "protocol_cycle" ADD COLUMN "preparation" jsonb;--> statement-breakpoint
ALTER TABLE "protocol_cycle_schedule_step" ADD COLUMN "times_of_day" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "protocol_cycle_schedule_step" ADD COLUMN "administrations_per_day" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "protocol_cycle_schedule_step" ADD COLUMN "dose_basis" text DEFAULT 'single_compound_mass' NOT NULL;--> statement-breakpoint
ALTER TABLE "protocol_cycle_schedule_step" ADD COLUMN "ingredient_doses" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "protocol_cycle_schedule_step" ADD COLUMN "route" text;--> statement-breakpoint
ALTER TABLE "member_protocol" ADD CONSTRAINT "member_protocol_source_approved_preset_id_approved_protocol_preset_id_fk" FOREIGN KEY ("source_approved_preset_id") REFERENCES "public"."approved_protocol_preset"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_protocol_source_approved_idx" ON "member_protocol" USING btree ("source_approved_preset_id");--> statement-breakpoint
ALTER TABLE "member_protocol" ADD CONSTRAINT "member_protocol_duration_type_check" CHECK ("member_protocol"."duration_type" in ('fixed_cycle', 'open_ended', 'as_needed'));--> statement-breakpoint
ALTER TABLE "member_protocol" ADD CONSTRAINT "member_protocol_duration_check" CHECK (("member_protocol"."duration_type" = 'fixed_cycle' and "member_protocol"."duration_days" > 0) or ("member_protocol"."duration_type" in ('open_ended', 'as_needed') and "member_protocol"."duration_days" is null));--> statement-breakpoint
ALTER TABLE "member_protocol" ADD CONSTRAINT "member_protocol_origin_check" CHECK ("member_protocol"."origin" in ('custom', 'template', 'approved_preset'));--> statement-breakpoint
ALTER TABLE "member_protocol" ADD CONSTRAINT "member_protocol_provenance_check" CHECK ((
        "member_protocol"."origin" = 'custom'
        and "member_protocol"."source_template_id" is null
        and "member_protocol"."source_template_version_id" is null
        and "member_protocol"."source_approved_preset_id" is null
        and "member_protocol"."template_schedule_unchanged" = false
      ) or (
        "member_protocol"."origin" = 'template'
        and "member_protocol"."source_template_id" is not null
        and "member_protocol"."source_template_version_id" is not null
        and "member_protocol"."source_approved_preset_id" is null
      ) or (
        "member_protocol"."origin" = 'approved_preset'
        and "member_protocol"."source_template_id" is null
        and "member_protocol"."source_template_version_id" is null
        and "member_protocol"."source_approved_preset_id" is not null
      ));--> statement-breakpoint
ALTER TABLE "member_protocol_schedule_step" ADD CONSTRAINT "member_protocol_schedule_step_administrations_check" CHECK ("member_protocol_schedule_step"."administrations_per_day" > 0);--> statement-breakpoint
ALTER TABLE "member_protocol_schedule_step" ADD CONSTRAINT "member_protocol_schedule_step_frequency_check" CHECK ("member_protocol_schedule_step"."frequency" in ('daily', 'weekly', 'interval_days', 'as_needed'));--> statement-breakpoint
ALTER TABLE "member_protocol_schedule_step" ADD CONSTRAINT "member_protocol_schedule_step_end_check" CHECK ("member_protocol_schedule_step"."end_day" is null or "member_protocol_schedule_step"."end_day" >= "member_protocol_schedule_step"."start_day");--> statement-breakpoint
ALTER TABLE "protocol_cycle" ADD CONSTRAINT "protocol_cycle_duration_type_check" CHECK ("protocol_cycle"."duration_type" in ('fixed_cycle', 'open_ended', 'as_needed'));--> statement-breakpoint
ALTER TABLE "protocol_cycle" ADD CONSTRAINT "protocol_cycle_dates_check" CHECK ("protocol_cycle"."planned_end_date" is null or "protocol_cycle"."planned_end_date" >= "protocol_cycle"."start_date");--> statement-breakpoint
ALTER TABLE "protocol_cycle_schedule_step" ADD CONSTRAINT "protocol_cycle_schedule_step_administrations_check" CHECK ("protocol_cycle_schedule_step"."administrations_per_day" > 0);--> statement-breakpoint
ALTER TABLE "protocol_cycle_schedule_step" ADD CONSTRAINT "protocol_cycle_schedule_step_frequency_check" CHECK ("protocol_cycle_schedule_step"."frequency" in ('daily', 'weekly', 'interval_days', 'as_needed'));--> statement-breakpoint
ALTER TABLE "protocol_cycle_schedule_step" ADD CONSTRAINT "protocol_cycle_schedule_step_end_check" CHECK ("protocol_cycle_schedule_step"."end_day" is null or "protocol_cycle_schedule_step"."end_day" >= "protocol_cycle_schedule_step"."start_day");