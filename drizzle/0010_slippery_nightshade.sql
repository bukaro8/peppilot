ALTER TABLE "injection_record" DROP CONSTRAINT "injection_record_actual_fields_check";--> statement-breakpoint
ALTER TABLE "injection_record" ADD COLUMN "injection_site_id" text;--> statement-breakpoint
ALTER TABLE "injection_record_history" ADD COLUMN "previous_injection_site_id" text;--> statement-breakpoint
ALTER TABLE "injection_record" ADD CONSTRAINT "injection_record_site_check" CHECK ("injection_record"."injection_site_id" is null or "injection_record"."injection_site_id" in (
        'abdomen_left_upper', 'abdomen_left_lower', 'abdomen_right_upper', 'abdomen_right_lower',
        'love_handle_left', 'love_handle_right',
        'thigh_left_upper', 'thigh_left_lower', 'thigh_right_upper', 'thigh_right_lower',
        'upper_arm_left', 'upper_arm_right', 'upper_buttock_left', 'upper_buttock_right'
      ));--> statement-breakpoint
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
        and "injection_record"."injection_site_id" is null
      ));