CREATE TABLE "external_document_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"related_entity_type" text NOT NULL,
	"related_entity_id" text NOT NULL,
	"display_name" text NOT NULL,
	"external_url" text NOT NULL,
	"category" text,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "activation_token_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "activation_token_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "external_document_links" ADD CONSTRAINT "external_document_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_document_links" ADD CONSTRAINT "external_document_links_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;