CREATE TABLE "protocol_cycle_goal" (
	"id" text PRIMARY KEY NOT NULL,
	"cycle_id" text NOT NULL,
	"metric_id" text NOT NULL,
	"target_value" numeric(14, 4),
	"target_unit" text NOT NULL,
	"baseline_status" text NOT NULL,
	"baseline_source_type" text NOT NULL,
	"baseline_source_id" text,
	"baseline_value" numeric(14, 4),
	"baseline_unit" text,
	"baseline_observed_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "protocol_cycle_goal_metric_check" CHECK ("protocol_cycle_goal"."metric_id" in (
        'weight', 'waist_circumference', 'body_fat_percentage', 'muscle_mass',
        'hip_circumference', 'chest_circumference', 'sleep_quality', 'energy',
        'recovery', 'appetite_control', 'waist_body_composition', 'pain_mobility',
        'focus', 'stress'
      )),
	CONSTRAINT "protocol_cycle_goal_unit_check" CHECK ("protocol_cycle_goal"."target_unit" in ('kg', 'cm', 'percent', 'score')),
	CONSTRAINT "protocol_cycle_goal_target_check" CHECK ("protocol_cycle_goal"."target_value" is null or "protocol_cycle_goal"."target_value" > 0),
	CONSTRAINT "protocol_cycle_goal_baseline_status_check" CHECK ("protocol_cycle_goal"."baseline_status" in ('valid', 'missing', 'unsuitable')),
	CONSTRAINT "protocol_cycle_goal_baseline_source_check" CHECK ("protocol_cycle_goal"."baseline_source_type" in ('measurement', 'check_in', 'none')),
	CONSTRAINT "protocol_cycle_goal_baseline_snapshot_check" CHECK ((
        "protocol_cycle_goal"."baseline_status" = 'missing'
        and "protocol_cycle_goal"."baseline_source_type" = 'none'
        and "protocol_cycle_goal"."baseline_source_id" is null
        and "protocol_cycle_goal"."baseline_value" is null
        and "protocol_cycle_goal"."baseline_unit" is null
        and "protocol_cycle_goal"."baseline_observed_on" is null
      ) or (
        "protocol_cycle_goal"."baseline_status" in ('valid', 'unsuitable')
        and "protocol_cycle_goal"."baseline_source_type" in ('measurement', 'check_in')
        and "protocol_cycle_goal"."baseline_source_id" is not null
        and "protocol_cycle_goal"."baseline_value" is not null
        and "protocol_cycle_goal"."baseline_unit" is not null
        and "protocol_cycle_goal"."baseline_observed_on" is not null
      ))
);
--> statement-breakpoint
ALTER TABLE "protocol_cycle_goal" ADD CONSTRAINT "protocol_cycle_goal_cycle_id_protocol_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."protocol_cycle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "protocol_cycle_goal_cycle_metric_unique" ON "protocol_cycle_goal" USING btree ("cycle_id","metric_id");--> statement-breakpoint
CREATE INDEX "protocol_cycle_goal_cycle_idx" ON "protocol_cycle_goal" USING btree ("cycle_id");