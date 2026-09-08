CREATE TABLE "vendor_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_category_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"email" text,
	"phone" text,
	"mobile_phone" text,
	"notes" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_property_coverage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"legal_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_preferred" boolean DEFAULT false NOT NULL,
	"primary_phone" text,
	"primary_email" text,
	"website" text,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"country" text,
	"account_number" text,
	"notes" text,
	"coverage_mode" text DEFAULT 'all' NOT NULL,
	"insurance_expires_at" date,
	"license_expires_at" date,
	"contract_expires_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "equipment_service_records" ADD COLUMN "vendor_id" uuid;--> statement-breakpoint
ALTER TABLE "preventive_maintenance_plans" ADD COLUMN "default_vendor_id" uuid;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "vendor_id" uuid;--> statement-breakpoint
ALTER TABLE "vendor_categories" ADD CONSTRAINT "vendor_categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_category_links" ADD CONSTRAINT "vendor_category_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_category_links" ADD CONSTRAINT "vendor_category_links_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_category_links" ADD CONSTRAINT "vendor_category_links_category_id_vendor_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."vendor_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_contacts" ADD CONSTRAINT "vendor_contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_contacts" ADD CONSTRAINT "vendor_contacts_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_property_coverage" ADD CONSTRAINT "vendor_property_coverage_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_property_coverage" ADD CONSTRAINT "vendor_property_coverage_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_property_coverage" ADD CONSTRAINT "vendor_property_coverage_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_categories_org_slug_unique" ON "vendor_categories" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_category_links_vendor_category_unique" ON "vendor_category_links" USING btree ("vendor_id","category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_property_coverage_vendor_property_unique" ON "vendor_property_coverage" USING btree ("vendor_id","property_id");--> statement-breakpoint
ALTER TABLE "equipment_service_records" ADD CONSTRAINT "equipment_service_records_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preventive_maintenance_plans" ADD CONSTRAINT "preventive_maintenance_plans_default_vendor_id_vendors_id_fk" FOREIGN KEY ("default_vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;