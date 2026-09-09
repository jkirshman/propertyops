CREATE TABLE "property_companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"legal_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_component_service_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"property_component_id" uuid NOT NULL,
	"service_date" date NOT NULL,
	"description" text NOT NULL,
	"vendor_id" uuid,
	"cost" numeric(10, 2),
	"notes" text,
	"performed_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"component_type" text NOT NULL,
	"other_type_label" text,
	"name" text,
	"description" text,
	"installed_date" date,
	"replacement_date" date,
	"expected_useful_life_years" integer,
	"warranty_expiration" date,
	"vendor_id" uuid,
	"condition" text DEFAULT 'unknown' NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"category" text NOT NULL,
	"caption" text,
	"property_unit_id" uuid,
	"is_cover" boolean DEFAULT false NOT NULL,
	"uploaded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"unit_label" text NOT NULL,
	"name" text,
	"square_footage" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leases" ADD COLUMN "property_unit_id" uuid;--> statement-breakpoint
ALTER TABLE "preventive_maintenance_plans" ADD COLUMN "property_component_id" uuid;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "property_company_id" uuid;--> statement-breakpoint
ALTER TABLE "property_contacts" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "property_contacts" ADD COLUMN "mobile_phone" text;--> statement-breakpoint
ALTER TABLE "property_types" ADD COLUMN "supports_units" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "property_component_id" uuid;--> statement-breakpoint
ALTER TABLE "property_companies" ADD CONSTRAINT "property_companies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_component_service_records" ADD CONSTRAINT "property_component_service_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_component_service_records" ADD CONSTRAINT "property_component_service_records_property_component_id_property_components_id_fk" FOREIGN KEY ("property_component_id") REFERENCES "public"."property_components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_component_service_records" ADD CONSTRAINT "property_component_service_records_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_component_service_records" ADD CONSTRAINT "property_component_service_records_performed_by_user_id_users_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_components" ADD CONSTRAINT "property_components_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_components" ADD CONSTRAINT "property_components_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_components" ADD CONSTRAINT "property_components_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_photos" ADD CONSTRAINT "property_photos_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_photos" ADD CONSTRAINT "property_photos_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_photos" ADD CONSTRAINT "property_photos_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_photos" ADD CONSTRAINT "property_photos_property_unit_id_property_units_id_fk" FOREIGN KEY ("property_unit_id") REFERENCES "public"."property_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_photos" ADD CONSTRAINT "property_photos_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_units" ADD CONSTRAINT "property_units_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_units" ADD CONSTRAINT "property_units_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "property_units_property_label_unique" ON "property_units" USING btree ("property_id","unit_label");--> statement-breakpoint
ALTER TABLE "leases" ADD CONSTRAINT "leases_property_unit_id_property_units_id_fk" FOREIGN KEY ("property_unit_id") REFERENCES "public"."property_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preventive_maintenance_plans" ADD CONSTRAINT "preventive_maintenance_plans_property_component_id_property_components_id_fk" FOREIGN KEY ("property_component_id") REFERENCES "public"."property_components"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_property_company_id_property_companies_id_fk" FOREIGN KEY ("property_company_id") REFERENCES "public"."property_companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_property_component_id_property_components_id_fk" FOREIGN KEY ("property_component_id") REFERENCES "public"."property_components"("id") ON DELETE set null ON UPDATE no action;