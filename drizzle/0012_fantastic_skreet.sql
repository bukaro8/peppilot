CREATE TABLE "health_measurement" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"metric_id" text NOT NULL,
	"observed_on" date NOT NULL,
	"canonical_value" numeric(14, 4) NOT NULL,
	"canonical_unit" text NOT NULL,
	"entered_value" numeric(14, 4) NOT NULL,
	"entered_unit" text NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "health_measurement_metric_check" CHECK ("health_measurement"."metric_id" in ('weight', 'waist_circumference', 'body_fat_percentage', 'muscle_mass', 'hip_circumference', 'chest_circumference')),
	CONSTRAINT "health_measurement_canonical_unit_check" CHECK ("health_measurement"."canonical_unit" in ('kg', 'cm', 'percent')),
	CONSTRAINT "health_measurement_entered_unit_check" CHECK ("health_measurement"."entered_unit" in ('kg', 'lb', 'cm', 'in', 'percent')),
	CONSTRAINT "health_measurement_value_check" CHECK ("health_measurement"."canonical_value" > 0 and "health_measurement"."entered_value" > 0),
	CONSTRAINT "health_measurement_source_check" CHECK ("health_measurement"."source" = 'manual'),
	CONSTRAINT "health_measurement_notes_check" CHECK ("health_measurement"."notes" is null or char_length("health_measurement"."notes") <= 500)
);
--> statement-breakpoint
ALTER TABLE "health_measurement" ADD CONSTRAINT "health_measurement_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "health_measurement_owner_date_idx" ON "health_measurement" USING btree ("owner_user_id","observed_on");--> statement-breakpoint
CREATE INDEX "health_measurement_owner_metric_date_idx" ON "health_measurement" USING btree ("owner_user_id","metric_id","observed_on");