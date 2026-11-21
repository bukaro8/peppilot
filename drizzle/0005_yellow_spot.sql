CREATE TABLE "catalogue_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"category" text NOT NULL,
	"kind" text NOT NULL,
	"description" text,
	"tracking_focus" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalogue_entry_slug_unique" UNIQUE("slug"),
	CONSTRAINT "catalogue_entry_category_check" CHECK ("catalogue_entry"."category" in ('weight_management', 'healing_skin_recovery', 'growth_body_composition', 'metabolic_wellness', 'cognitive')),
	CONSTRAINT "catalogue_entry_kind_check" CHECK ("catalogue_entry"."kind" in ('peptide', 'blend', 'tracked_compound')),
	CONSTRAINT "catalogue_entry_slug_check" CHECK ("catalogue_entry"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "catalogue_entry_ingredient" (
	"catalogue_entry_id" text NOT NULL,
	"ingredient_slug" text NOT NULL,
	"display_name" text NOT NULL,
	"linked_catalogue_entry_id" text,
	"position" integer NOT NULL,
	CONSTRAINT "catalogue_entry_ingredient_catalogue_entry_id_ingredient_slug_pk" PRIMARY KEY("catalogue_entry_id","ingredient_slug"),
	CONSTRAINT "catalogue_entry_ingredient_position_check" CHECK ("catalogue_entry_ingredient"."position" > 0),
	CONSTRAINT "catalogue_entry_ingredient_slug_check" CHECK ("catalogue_entry_ingredient"."ingredient_slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
--> statement-breakpoint
ALTER TABLE "catalogue_entry_ingredient" ADD CONSTRAINT "catalogue_entry_ingredient_catalogue_entry_id_catalogue_entry_id_fk" FOREIGN KEY ("catalogue_entry_id") REFERENCES "public"."catalogue_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue_entry_ingredient" ADD CONSTRAINT "catalogue_entry_ingredient_linked_catalogue_entry_id_catalogue_entry_id_fk" FOREIGN KEY ("linked_catalogue_entry_id") REFERENCES "public"."catalogue_entry"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalogue_entry_category_idx" ON "catalogue_entry" USING btree ("category");--> statement-breakpoint
CREATE INDEX "catalogue_entry_ingredient_entry_idx" ON "catalogue_entry_ingredient" USING btree ("catalogue_entry_id");