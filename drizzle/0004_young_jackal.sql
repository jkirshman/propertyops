CREATE TABLE "equipment_catalog_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" text,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_service_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"property_equipment_id" uuid NOT NULL,
	"service_date" date NOT NULL,
	"service_type" text NOT NULL,
	"summary" text NOT NULL,
	"vendor_name" text,
	"cost" numeric(10, 2),
	"meter_reading" integer,
	"performed_by_user_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_template_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"equipment_catalog_item_id" uuid NOT NULL,
	"expected_quantity" integer DEFAULT 1 NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"equipment_catalog_item_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"equipment_tag" text,
	"manufacturer" text,
	"model" text,
	"serial_number" text,
	"installed_date" date,
	"manufacture_year" integer,
	"location_in_property" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"condition" text DEFAULT 'unknown' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expected_replacement_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "equipment_template_mode" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "equipment_template_id" uuid;--> statement-breakpoint
ALTER TABLE "property_types" ADD COLUMN "default_equipment_template_id" uuid;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "property_equipment_id" uuid;--> statement-breakpoint
ALTER TABLE "equipment_catalog_items" ADD CONSTRAINT "equipment_catalog_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_service_records" ADD CONSTRAINT "equipment_service_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_service_records" ADD CONSTRAINT "equipment_service_records_property_equipment_id_property_equipment_id_fk" FOREIGN KEY ("property_equipment_id") REFERENCES "public"."property_equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_service_records" ADD CONSTRAINT "equipment_service_records_performed_by_user_id_users_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_template_items" ADD CONSTRAINT "equipment_template_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_template_items" ADD CONSTRAINT "equipment_template_items_template_id_equipment_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."equipment_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_template_items" ADD CONSTRAINT "equipment_template_items_equipment_catalog_item_id_equipment_catalog_items_id_fk" FOREIGN KEY ("equipment_catalog_item_id") REFERENCES "public"."equipment_catalog_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_templates" ADD CONSTRAINT "equipment_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_equipment" ADD CONSTRAINT "property_equipment_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_equipment" ADD CONSTRAINT "property_equipment_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_equipment" ADD CONSTRAINT "property_equipment_equipment_catalog_item_id_equipment_catalog_items_id_fk" FOREIGN KEY ("equipment_catalog_item_id") REFERENCES "public"."equipment_catalog_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "equipment_catalog_items_org_slug_unique" ON "equipment_catalog_items" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "equipment_template_items_template_catalog_unique" ON "equipment_template_items" USING btree ("template_id","equipment_catalog_item_id");--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_equipment_template_id_equipment_templates_id_fk" FOREIGN KEY ("equipment_template_id") REFERENCES "public"."equipment_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_types" ADD CONSTRAINT "property_types_default_equipment_template_id_equipment_templates_id_fk" FOREIGN KEY ("default_equipment_template_id") REFERENCES "public"."equipment_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_property_equipment_id_property_equipment_id_fk" FOREIGN KEY ("property_equipment_id") REFERENCES "public"."property_equipment"("id") ON DELETE set null ON UPDATE no action;