-- PHOTO-1 (additive). The single-owner CHECK is NOT VALID on purpose: new and
-- updated rows are enforced, but existing rows are not re-validated, so a
-- legacy row carrying both a Unit and a Component can never block this
-- migration. Hand-edited only to append NOT VALID.
ALTER TABLE "property_photos" ADD COLUMN "property_equipment_id" uuid;--> statement-breakpoint
ALTER TABLE "property_photos" ADD CONSTRAINT "property_photos_property_equipment_id_property_equipment_id_fk" FOREIGN KEY ("property_equipment_id") REFERENCES "public"."property_equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_photos" ADD CONSTRAINT "property_photos_single_owner" CHECK (num_nonnulls("property_photos"."property_unit_id", "property_photos"."property_component_id", "property_photos"."property_equipment_id") <= 1) NOT VALID;