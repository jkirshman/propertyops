CREATE TABLE "preventive_maintenance_occurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"due_date" date NOT NULL,
	"work_order_id" uuid,
	"status" text DEFAULT 'generated' NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"generated_by_user_id" uuid,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preventive_maintenance_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"property_equipment_id" uuid,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"instructions" text,
	"default_priority" text DEFAULT 'normal' NOT NULL,
	"default_assignee_user_id" uuid,
	"interval_unit" text NOT NULL,
	"interval_value" integer DEFAULT 1 NOT NULL,
	"next_due_at" date NOT NULL,
	"last_generated_at" timestamp with time zone,
	"last_completed_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "preventive_maintenance_occurrences" ADD CONSTRAINT "preventive_maintenance_occurrences_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preventive_maintenance_occurrences" ADD CONSTRAINT "preventive_maintenance_occurrences_plan_id_preventive_maintenance_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."preventive_maintenance_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preventive_maintenance_occurrences" ADD CONSTRAINT "preventive_maintenance_occurrences_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preventive_maintenance_occurrences" ADD CONSTRAINT "preventive_maintenance_occurrences_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preventive_maintenance_occurrences" ADD CONSTRAINT "preventive_maintenance_occurrences_generated_by_user_id_users_id_fk" FOREIGN KEY ("generated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preventive_maintenance_plans" ADD CONSTRAINT "preventive_maintenance_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preventive_maintenance_plans" ADD CONSTRAINT "preventive_maintenance_plans_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preventive_maintenance_plans" ADD CONSTRAINT "preventive_maintenance_plans_property_equipment_id_property_equipment_id_fk" FOREIGN KEY ("property_equipment_id") REFERENCES "public"."property_equipment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preventive_maintenance_plans" ADD CONSTRAINT "preventive_maintenance_plans_category_id_work_order_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."work_order_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preventive_maintenance_plans" ADD CONSTRAINT "preventive_maintenance_plans_default_assignee_user_id_users_id_fk" FOREIGN KEY ("default_assignee_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pm_occurrences_plan_due_date_unique" ON "preventive_maintenance_occurrences" USING btree ("plan_id","due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "pm_occurrences_work_order_unique" ON "preventive_maintenance_occurrences" USING btree ("work_order_id");