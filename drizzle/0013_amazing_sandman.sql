CREATE TABLE "check_in_question_preference" (
	"owner_user_id" text NOT NULL,
	"question_id" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "check_in_question_preference_owner_user_id_question_id_pk" PRIMARY KEY("owner_user_id","question_id"),
	CONSTRAINT "check_in_question_preference_question_check" CHECK ("check_in_question_preference"."question_id" in ('appetite_control', 'waist_body_composition', 'pain_mobility', 'focus', 'stress'))
);
--> statement-breakpoint
CREATE TABLE "daily_check_in" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"check_in_date" date NOT NULL,
	"symptom_status" text DEFAULT 'not_answered' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_check_in_symptom_status_check" CHECK ("daily_check_in"."symptom_status" in ('not_answered', 'no_symptoms', 'symptoms_recorded'))
);
--> statement-breakpoint
CREATE TABLE "daily_check_in_answer" (
	"check_in_id" text NOT NULL,
	"question_id" text NOT NULL,
	"score" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_check_in_answer_check_in_id_question_id_pk" PRIMARY KEY("check_in_id","question_id"),
	CONSTRAINT "daily_check_in_answer_score_check" CHECK ("daily_check_in_answer"."score" between 1 and 10),
	CONSTRAINT "daily_check_in_answer_question_check" CHECK ("daily_check_in_answer"."question_id" in ('sleep_quality', 'energy', 'recovery', 'appetite_control', 'waist_body_composition', 'pain_mobility', 'focus', 'stress'))
);
--> statement-breakpoint
CREATE TABLE "symptom_record" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"check_in_id" text,
	"symptom_date" date NOT NULL,
	"symptom_id" text NOT NULL,
	"custom_description" text,
	"severity" integer NOT NULL,
	"started_at" time,
	"ended_at" time,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "symptom_record_symptom_check" CHECK ("symptom_record"."symptom_id" in ('headache', 'nausea', 'fatigue', 'dizziness', 'digestive_discomfort', 'injection_site_reaction', 'pain', 'sleep_disturbance', 'custom')),
	CONSTRAINT "symptom_record_severity_check" CHECK ("symptom_record"."severity" between 1 and 10),
	CONSTRAINT "symptom_record_description_check" CHECK (("symptom_record"."symptom_id" = 'custom' and char_length("symptom_record"."custom_description") between 1 and 120) or ("symptom_record"."symptom_id" <> 'custom' and ("symptom_record"."custom_description" is null or char_length("symptom_record"."custom_description") <= 120))),
	CONSTRAINT "symptom_record_notes_check" CHECK ("symptom_record"."notes" is null or char_length("symptom_record"."notes") <= 1000),
	CONSTRAINT "symptom_record_time_check" CHECK ("symptom_record"."started_at" is null or "symptom_record"."ended_at" is null or "symptom_record"."ended_at" >= "symptom_record"."started_at")
);
--> statement-breakpoint
ALTER TABLE "check_in_question_preference" ADD CONSTRAINT "check_in_question_preference_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_check_in" ADD CONSTRAINT "daily_check_in_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_check_in_answer" ADD CONSTRAINT "daily_check_in_answer_check_in_id_daily_check_in_id_fk" FOREIGN KEY ("check_in_id") REFERENCES "public"."daily_check_in"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "symptom_record" ADD CONSTRAINT "symptom_record_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "symptom_record" ADD CONSTRAINT "symptom_record_check_in_id_daily_check_in_id_fk" FOREIGN KEY ("check_in_id") REFERENCES "public"."daily_check_in"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_check_in_owner_date_unique" ON "daily_check_in" USING btree ("owner_user_id","check_in_date");--> statement-breakpoint
CREATE INDEX "daily_check_in_owner_date_idx" ON "daily_check_in" USING btree ("owner_user_id","check_in_date");--> statement-breakpoint
CREATE INDEX "symptom_record_owner_date_idx" ON "symptom_record" USING btree ("owner_user_id","symptom_date");--> statement-breakpoint
CREATE INDEX "symptom_record_check_in_idx" ON "symptom_record" USING btree ("check_in_id");