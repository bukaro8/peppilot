CREATE TABLE "community_aggregate_invalidation" (
	"user_id" text PRIMARY KEY NOT NULL,
	"invalidated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "community_analytics_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "community_analytics_updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "community_aggregate_invalidation" ADD CONSTRAINT "community_aggregate_invalidation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;