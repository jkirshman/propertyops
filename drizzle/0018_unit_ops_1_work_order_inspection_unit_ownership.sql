ALTER TABLE "inspections" ADD COLUMN "property_unit_id" uuid;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "property_unit_id" uuid;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_property_unit_id_property_units_id_fk" FOREIGN KEY ("property_unit_id") REFERENCES "public"."property_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_property_unit_id_property_units_id_fk" FOREIGN KEY ("property_unit_id") REFERENCES "public"."property_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inspections_property_unit_idx" ON "inspections" USING btree ("property_id","property_unit_id");--> statement-breakpoint
CREATE INDEX "work_orders_property_unit_idx" ON "work_orders" USING btree ("property_id","property_unit_id");