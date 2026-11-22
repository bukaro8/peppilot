CREATE TABLE "approved_protocol_preset" (
	"id" text PRIMARY KEY NOT NULL,
	"catalogue_entry_id" text NOT NULL,
	"category" text NOT NULL,
	"schema_version" text NOT NULL,
	"duration_type" text NOT NULL,
	"definition" jsonb NOT NULL,
	"compound_context" jsonb NOT NULL,
	"source_checksum" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approved_protocol_preset_category_check" CHECK ("approved_protocol_preset"."category" in ('conservative', 'most_used', 'adventurous')),
	CONSTRAINT "approved_protocol_preset_duration_type_check" CHECK ("approved_protocol_preset"."duration_type" in ('fixed_cycle', 'open_ended', 'as_needed'))
);
--> statement-breakpoint
ALTER TABLE "approved_protocol_preset" ADD CONSTRAINT "approved_protocol_preset_catalogue_entry_id_catalogue_entry_id_fk" FOREIGN KEY ("catalogue_entry_id") REFERENCES "public"."catalogue_entry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "approved_protocol_preset_compound_category_unique" ON "approved_protocol_preset" USING btree ("catalogue_entry_id","category");--> statement-breakpoint
CREATE INDEX "approved_protocol_preset_catalogue_idx" ON "approved_protocol_preset" USING btree ("catalogue_entry_id");