ALTER TABLE "catalogue_entry" DROP CONSTRAINT "catalogue_entry_kind_check";--> statement-breakpoint
ALTER TABLE "injection_record" DROP CONSTRAINT "injection_record_actual_fields_check";--> statement-breakpoint
ALTER TABLE "catalogue_entry_ingredient" ADD COLUMN "composition" text;--> statement-breakpoint
ALTER TABLE "injection_record" ADD COLUMN "actual_volume_ml" numeric(8, 4);--> statement-breakpoint
ALTER TABLE "injection_record_history" ADD COLUMN "previous_actual_volume_ml" numeric(8, 4);--> statement-breakpoint
ALTER TABLE "catalogue_entry" ADD CONSTRAINT "catalogue_entry_kind_check" CHECK ("catalogue_entry"."kind" in ('peptide', 'blend', 'combination', 'tracked_compound'));--> statement-breakpoint
ALTER TABLE "injection_record" ADD CONSTRAINT "injection_record_actual_volume_check" CHECK ("injection_record"."actual_volume_ml" is null or "injection_record"."actual_volume_ml" > 0);--> statement-breakpoint
ALTER TABLE "injection_record" ADD CONSTRAINT "injection_record_actual_fields_check" CHECK ((
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
        and "injection_record"."actual_volume_ml" is null
        and "injection_record"."injection_site_id" is null
      ));