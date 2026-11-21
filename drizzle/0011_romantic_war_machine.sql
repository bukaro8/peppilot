CREATE TABLE "member_injection_site_preference" (
	"owner_user_id" text NOT NULL,
	"injection_site_id" text NOT NULL,
	"disabled_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_injection_site_preference_owner_user_id_injection_site_id_pk" PRIMARY KEY("owner_user_id","injection_site_id"),
	CONSTRAINT "member_injection_site_preference_site_check" CHECK ("member_injection_site_preference"."injection_site_id" in (
        'abdomen_left_upper', 'abdomen_left_lower', 'abdomen_right_upper', 'abdomen_right_lower',
        'love_handle_left', 'love_handle_right',
        'thigh_left_upper', 'thigh_left_lower', 'thigh_right_upper', 'thigh_right_lower',
        'upper_arm_left', 'upper_arm_right', 'upper_buttock_left', 'upper_buttock_right'
      ))
);
--> statement-breakpoint
ALTER TABLE "member_injection_site_preference" ADD CONSTRAINT "member_injection_site_preference_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_injection_site_preference_owner_idx" ON "member_injection_site_preference" USING btree ("owner_user_id");