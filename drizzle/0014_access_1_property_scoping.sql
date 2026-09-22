CREATE TABLE "user_property_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"property_unit_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid
);
--> statement-breakpoint
ALTER TABLE "property_contacts" ADD COLUMN "created_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "property_photos" ADD COLUMN "property_component_id" uuid;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "approval_status" text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "submitted_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "submission_property_id" uuid;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "submission_notes" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "reviewed_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "review_notes" text;--> statement-breakpoint
ALTER TABLE "user_property_access" ADD CONSTRAINT "user_property_access_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_property_access" ADD CONSTRAINT "user_property_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_property_access" ADD CONSTRAINT "user_property_access_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_property_access" ADD CONSTRAINT "user_property_access_property_unit_id_property_units_id_fk" FOREIGN KEY ("property_unit_id") REFERENCES "public"."property_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_property_access" ADD CONSTRAINT "user_property_access_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_property_access_whole_property_unique" ON "user_property_access" USING btree ("user_id","property_id") WHERE "user_property_access"."property_unit_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "user_property_access_unit_unique" ON "user_property_access" USING btree ("user_id","property_id","property_unit_id") WHERE "user_property_access"."property_unit_id" is not null;--> statement-breakpoint
ALTER TABLE "property_contacts" ADD CONSTRAINT "property_contacts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_photos" ADD CONSTRAINT "property_photos_property_component_id_property_components_id_fk" FOREIGN KEY ("property_component_id") REFERENCES "public"."property_components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_submission_property_id_properties_id_fk" FOREIGN KEY ("submission_property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;