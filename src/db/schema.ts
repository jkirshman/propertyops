import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    // IANA timezone identifier used to display/edit timed values (see PROP-10).
    // Date-only fields (compliance/lease dates, PM due dates) are never
    // converted through this — they stay plain calendar dates.
    timezone: text("timezone").notNull().default("America/Detroit"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("organizations_slug_unique").on(table.slug)],
);

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("roles_org_slug_unique").on(table.organizationId, table.slug)],
);

// Capabilities are a fixed, platform-defined vocabulary (not organization business
// data), so they are not organization-scoped. Roles grant capabilities per organization.
export const capabilities = pgTable(
  "capabilities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    description: text("description"),
  },
  (table) => [uniqueIndex("capabilities_key_unique").on(table.key)],
);

export const roleCapabilities = pgTable(
  "role_capabilities",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    capabilityId: uuid("capability_id")
      .notNull()
      .references(() => capabilities.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.capabilityId] })],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    displayName: text("display_name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [uniqueIndex("sessions_token_hash_unique").on(table.tokenHash)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    recipientUserId: uuid("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    relatedEntityType: text("related_entity_type"),
    relatedEntityId: text("related_entity_id"),
    deepLinkUrl: text("deep_link_url"),
    metadata: jsonb("metadata"),
    dedupeKey: text("dedupe_key"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // NULLs are distinct in a unique index, so notifications with no dedupe key
    // never collide with each other — only repeated (recipient, dedupeKey) pairs do.
    uniqueIndex("notifications_recipient_dedupe_unique").on(
      table.recipientUserId,
      table.dedupeKey,
    ),
  ],
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    inAppEnabled: boolean("in_app_enabled").notNull().default(true),
    emailEnabled: boolean("email_enabled").notNull().default(true),
    // Independent of inAppEnabled/emailEnabled — controls only whether this
    // category's Home App Brief sections render, not notification delivery.
    appBriefEnabled: boolean("app_brief_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("notification_preferences_user_category_unique").on(
      table.userId,
      table.category,
    ),
  ],
);

export const emailSendAttempts = pgTable("email_send_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  toEmailMasked: text("to_email_masked").notNull(),
  subject: text("subject").notNull(),
  kind: text("kind").notNull(),
  status: text("status").notNull(),
  failureReason: text("failure_reason"),
  providerMessageId: text("provider_message_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  blobPathname: text("blob_pathname").notNull(),
  // Generic reusable association, same shape as notifications' related-entity
  // fields — lets Properties (and future modules) attach files without a
  // dedicated join table per module.
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: text("related_entity_id"),
  title: text("title"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const propertyTypes = pgTable(
  "property_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    // References equipmentTemplates, declared later in this file — safe because
    // drizzle resolves the reference lazily via this closure, not at declaration time.
    defaultEquipmentTemplateId: uuid("default_equipment_template_id").references(
      (): typeof equipmentTemplates.id => equipmentTemplates.id,
      { onDelete: "set null" },
    ),
    // Gates whether a Property Profile of this type shows the Units/Suites
    // workflow (POLISH-2) — data-driven rather than hardcoding a type slug in
    // application code, so a future multi-tenant type can opt in without a
    // code change.
    supportsUnits: boolean("supports_units").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("property_types_org_slug_unique").on(table.organizationId, table.slug)],
);

// A configurable, org-scoped ownership entity ("who owns this property"),
// referenced by Property but never required — many properties may not yet
// have an assigned company (POLISH-2).
export const propertyCompanies = pgTable("property_companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  legalName: text("legal_name"),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  propertyTypeId: uuid("property_type_id")
    .notNull()
    .references(() => propertyTypes.id, { onDelete: "restrict" }),
  // Nullable: no existing property has an ownership entity to preserve, and
  // requiring one would block editing properties whose ownership hasn't been
  // sorted out yet (POLISH-2).
  propertyCompanyId: uuid("property_company_id").references(() => propertyCompanies.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  propertyCode: text("property_code"),
  isActive: boolean("is_active").notNull().default(true),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country"),
  occupancyModel: text("occupancy_model").notNull().default("other"),
  squareFootage: integer("square_footage"),
  yearBuilt: integer("year_built"),
  parcelId: text("parcel_id"),
  description: text("description"),
  operationalNotes: text("operational_notes"),
  primaryPhone: text("primary_phone"),
  primaryEmail: text("primary_email"),
  // 'default' resolves the property type's default template; 'override' uses
  // equipmentTemplateId below; 'none' means no expected equipment at all.
  equipmentTemplateMode: text("equipment_template_mode").notNull().default("default"),
  equipmentTemplateId: uuid("equipment_template_id").references(
    (): typeof equipmentTemplates.id => equipmentTemplates.id,
    { onDelete: "set null" },
  ),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const propertyContacts = pgTable("property_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  contactType: text("contact_type").notNull(),
  title: text("title"),
  company: text("company"),
  email: text("email"),
  phone: text("phone"),
  mobilePhone: text("mobile_phone"),
  notes: text("notes"),
  isPrimary: boolean("is_primary").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const propertyNotes = pgTable("property_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Flat, per-property list of Units/Suites (POLISH-2) — no floor-plan/spatial
// layout. Occupancy is derived at read time from active Leases referencing
// this unit, never stored here.
export const propertyUnits = pgTable(
  "property_units",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    unitLabel: text("unit_label").notNull(),
    name: text("name"),
    squareFootage: integer("square_footage"),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("property_units_property_label_unique").on(table.propertyId, table.unitLabel)],
);

// Photo-specific metadata layered on top of a generic `files` row (fileId) —
// keeps `files` itself free of photo-only columns that every other module's
// attachments would carry unused (POLISH-3).
export const propertyPhotos = pgTable("property_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  fileId: uuid("file_id")
    .notNull()
    .references(() => files.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  caption: text("caption"),
  // Only populated for properties with Units (POLISH-2); a unit_suite-category
  // photo is still valid without one (vacant/unassigned space, or taken before
  // Units existed).
  propertyUnitId: uuid("property_unit_id").references(() => propertyUnits.id, {
    onDelete: "set null",
  }),
  // Exactly one cover photo per property is an application-level invariant
  // (setting a new one unsets the prior one), not a DB constraint — same
  // pattern as property_contacts.isPrimary.
  isCover: boolean("is_cover").notNull().default(false),
  uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const equipmentCatalogItems = pgTable(
  "equipment_catalog_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    category: text("category"),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("equipment_catalog_items_org_slug_unique").on(table.organizationId, table.slug),
  ],
);

export const equipmentTemplates = pgTable("equipment_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const equipmentTemplateItems = pgTable(
  "equipment_template_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => equipmentTemplates.id, { onDelete: "cascade" }),
    equipmentCatalogItemId: uuid("equipment_catalog_item_id")
      .notNull()
      .references(() => equipmentCatalogItems.id, { onDelete: "restrict" }),
    expectedQuantity: integer("expected_quantity").notNull().default(1),
    isRequired: boolean("is_required").notNull().default(true),
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("equipment_template_items_template_catalog_unique").on(
      table.templateId,
      table.equipmentCatalogItemId,
    ),
  ],
);

export const propertyEquipment = pgTable("property_equipment", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  equipmentCatalogItemId: uuid("equipment_catalog_item_id")
    .notNull()
    .references(() => equipmentCatalogItems.id, { onDelete: "restrict" }),
  displayName: text("display_name").notNull(),
  equipmentTag: text("equipment_tag"),
  manufacturer: text("manufacturer"),
  model: text("model"),
  serialNumber: text("serial_number"),
  installedDate: date("installed_date"),
  manufactureYear: integer("manufacture_year"),
  locationInProperty: text("location_in_property"),
  quantity: integer("quantity").notNull().default(1),
  status: text("status").notNull().default("active"),
  condition: text("condition").notNull().default("unknown"),
  isActive: boolean("is_active").notNull().default(true),
  expectedReplacementDate: date("expected_replacement_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const equipmentServiceRecords = pgTable("equipment_service_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  propertyEquipmentId: uuid("property_equipment_id")
    .notNull()
    .references(() => propertyEquipment.id, { onDelete: "cascade" }),
  serviceDate: date("service_date").notNull(),
  serviceType: text("service_type").notNull(),
  summary: text("summary").notNull(),
  vendorName: text("vendor_name"),
  cost: numeric("cost", { precision: 10, scale: 2, mode: "number" }),
  meterReading: integer("meter_reading"),
  performedByUserId: uuid("performed_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  // Additive alongside the free-text vendorName above — fully backward
  // compatible with existing records, which keep vendorName and leave this null.
  vendorId: uuid("vendor_id").references((): typeof vendors.id => vendors.id, {
    onDelete: "set null",
  }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Physical, non-movable building/site features (roof, parking lot,
// landscaping, ...) — distinct from Equipment (which is scoped to a required
// equipment-catalog item and carries the template/expected-vs-actual
// machinery Components don't need) and from Assets (movable, custody-tracked).
export const propertyComponents = pgTable("property_components", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  // Fixed, seeded vocabulary (see lib/property-components/constants.ts), not a
  // per-organization configurable taxonomy — short, unlikely to need per-org
  // customization.
  componentType: text("component_type").notNull(),
  // Only populated (and only meaningful) when componentType === 'other'.
  otherTypeLabel: text("other_type_label"),
  name: text("name"),
  description: text("description"),
  installedDate: date("installed_date"),
  replacementDate: date("replacement_date"),
  expectedUsefulLifeYears: integer("expected_useful_life_years"),
  warrantyExpiration: date("warranty_expiration"),
  vendorId: uuid("vendor_id").references((): typeof vendors.id => vendors.id, {
    onDelete: "set null",
  }),
  // Reuses Equipment's condition vocabulary (good/fair/poor/unknown) for
  // consistency across the app rather than a second condition scale.
  condition: text("condition").notNull().default("unknown"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Mirrors equipment_service_records' shape where it applies to a physical
// component; deliberately simpler (no serviceType/meterReading, which don't
// apply to a roof or parking lot) — a parallel, component-scoped table rather
// than generalizing equipment_service_records into a shared polymorphic one.
export const propertyComponentServiceRecords = pgTable("property_component_service_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  propertyComponentId: uuid("property_component_id")
    .notNull()
    .references(() => propertyComponents.id, { onDelete: "cascade" }),
  serviceDate: date("service_date").notNull(),
  description: text("description").notNull(),
  vendorId: uuid("vendor_id").references((): typeof vendors.id => vendors.id, {
    onDelete: "set null",
  }),
  cost: numeric("cost", { precision: 10, scale: 2, mode: "number" }),
  notes: text("notes"),
  performedByUserId: uuid("performed_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assetCategories = pgTable(
  "asset_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("asset_categories_org_slug_unique").on(table.organizationId, table.slug)],
);

// A lightweight organization identity, broader than "system user," for
// assigning assets to people who may or may not ever log in. Linkage to a
// user is explicit and optional (see linkedUserId) — never automatic.
export const people = pgTable("people", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  referenceNumber: text("reference_number"),
  isActive: boolean("is_active").notNull().default(true),
  linkedUserId: uuid("linked_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per organization, incremented atomically to produce stable,
// org-scoped ASSET-###### tags — same pattern as workOrderCounters.
export const assetCounters = pgTable("asset_counters", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  nextNumber: integer("next_number").notNull().default(1),
});

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    assetTag: text("asset_tag").notNull(),
    displayName: text("display_name").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => assetCategories.id, { onDelete: "restrict" }),
    manufacturer: text("manufacturer"),
    model: text("model"),
    serialNumber: text("serial_number"),
    status: text("status").notNull().default("available"),
    condition: text("condition").notNull().default("unknown"),
    isActive: boolean("is_active").notNull().default(true),
    acquiredDate: date("acquired_date"),
    purchaseCost: numeric("purchase_cost", { precision: 10, scale: 2, mode: "number" }),
    warrantyExpiration: date("warranty_expiration"),
    retiredDate: date("retired_date"),
    disposalReason: text("disposal_reason"),
    notes: text("notes"),
    // Current assignment lives here for fast reads; asset_assignments below is
    // the immutable history backing it (see currentAssignmentId).
    assignmentType: text("assignment_type").notNull().default("unassigned"),
    assignedPersonId: uuid("assigned_person_id").references(() => people.id, {
      onDelete: "set null",
    }),
    assignedPropertyId: uuid("assigned_property_id").references(() => properties.id, {
      onDelete: "set null",
    }),
    // References assetAssignments, which in turn references this table back
    // (assetId) — a genuine mutual cycle, so the closure return type must be
    // the generic AnyPgColumn rather than `typeof assetAssignments.id`, or
    // TypeScript can't resolve either table's column types.
    currentAssignmentId: uuid("current_assignment_id").references(
      (): AnyPgColumn => assetAssignments.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("assets_org_tag_unique").on(table.organizationId, table.assetTag)],
);

// Immutable assignment history: a row is inserted when an asset moves to a
// person or property, and only ever "closed" (returnedAt/returnedByUserId/
// returnNotes set) afterward — its core assignment facts are never rewritten.
// Returning to unassigned closes the active row without inserting a new one.
export const assetAssignments = pgTable("asset_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  assignmentType: text("assignment_type").notNull(),
  personId: uuid("person_id").references(() => people.id, { onDelete: "set null" }),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  assignedByUserId: uuid("assigned_by_user_id").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  returnedAt: timestamp("returned_at", { withTimezone: true }),
  returnedByUserId: uuid("returned_by_user_id").references(() => users.id, { onDelete: "set null" }),
  returnNotes: text("return_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workOrderCategories = pgTable(
  "work_order_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("work_order_categories_org_slug_unique").on(table.organizationId, table.slug),
  ],
);

// One row per organization, incremented atomically (inside the same transaction
// as the work order insert) to produce stable, org-scoped WO-###### numbers
// without relying on a global Postgres SEQUENCE.
export const workOrderCounters = pgTable("work_order_counters", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  nextNumber: integer("next_number").notNull().default(1),
});

export const workOrders = pgTable(
  "work_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    propertyEquipmentId: uuid("property_equipment_id").references(() => propertyEquipment.id, {
      onDelete: "set null",
    }),
    assetId: uuid("asset_id").references(() => assets.id, { onDelete: "set null" }),
    // Optional alongside Equipment/Asset (POLISH-3) — a Work Order may be
    // about a physical site feature instead of (or as well as) Equipment.
    propertyComponentId: uuid("property_component_id").references(() => propertyComponents.id, {
      onDelete: "set null",
    }),
    // One primary vendor per Work Order in PROP-7 — no multi-vendor dispatch yet.
    vendorId: uuid("vendor_id").references((): typeof vendors.id => vendors.id, {
      onDelete: "set null",
    }),
    number: text("number").notNull(),
    subject: text("subject").notNull(),
    description: text("description"),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => workOrderCategories.id, { onDelete: "restrict" }),
    priority: text("priority").notNull().default("normal"),
    source: text("source").notNull().default("staff"),
    status: text("status").notNull().default("new"),
    requesterUserId: uuid("requester_user_id").references(() => users.id, { onDelete: "set null" }),
    assignedUserId: uuid("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    resolutionSummary: text("resolution_summary"),
    // Optional scheduling (PROP-10) — never required. When set, this Work
    // Order projects onto the Operations Calendar as a timed event.
    scheduledStartAt: timestamp("scheduled_start_at", { withTimezone: true }),
    scheduledEndAt: timestamp("scheduled_end_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("work_orders_org_number_unique").on(table.organizationId, table.number)],
);

export const workOrderNotes = pgTable("work_order_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  workOrderId: uuid("work_order_id")
    .notNull()
    .references(() => workOrders.id, { onDelete: "cascade" }),
  authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  visibility: text("visibility").notNull().default("internal"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const preventiveMaintenancePlans = pgTable("preventive_maintenance_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  propertyEquipmentId: uuid("property_equipment_id").references(() => propertyEquipment.id, {
    onDelete: "set null",
  }),
  // Optional alongside propertyEquipmentId (POLISH-3), mirroring it exactly —
  // a PM plan may maintain a physical site feature instead of Equipment.
  propertyComponentId: uuid("property_component_id").references(() => propertyComponents.id, {
    onDelete: "set null",
  }),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => workOrderCategories.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  description: text("description"),
  instructions: text("instructions"),
  defaultPriority: text("default_priority").notNull().default("normal"),
  defaultAssigneeUserId: uuid("default_assignee_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  // Propagated onto each generated Work Order — default assignment only, no
  // auto-dispatch or vendor contact.
  defaultVendorId: uuid("default_vendor_id").references((): typeof vendors.id => vendors.id, {
    onDelete: "set null",
  }),
  // Deterministic recurrence, not a calendar rule designer: 'week' | 'month' plus
  // a count (e.g. month/3 = quarterly, week/2 = every 2 weeks).
  intervalUnit: text("interval_unit").notNull(),
  intervalValue: integer("interval_value").notNull().default(1),
  // Plain calendar date (no time-of-day component) so month/leap-year arithmetic
  // is unambiguous without an org-level timezone concept.
  nextDueAt: date("next_due_at").notNull(),
  lastGeneratedAt: timestamp("last_generated_at", { withTimezone: true }),
  lastCompletedAt: timestamp("last_completed_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// First-class row per due occurrence: the (planId, dueDate) unique index is the
// idempotency guarantee that a given due date generates at most one Work Order,
// even under concurrent/duplicate cron execution.
export const preventiveMaintenanceOccurrences = pgTable(
  "preventive_maintenance_occurrences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => preventiveMaintenancePlans.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    dueDate: date("due_date").notNull(),
    // NULLs are distinct in a unique index (see notifications_recipient_dedupe_unique),
    // so this stays unique per generated work order without blocking un-linked rows.
    workOrderId: uuid("work_order_id").references(() => workOrders.id, { onDelete: "set null" }),
    status: text("status").notNull().default("generated"),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
    generatedByUserId: uuid("generated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("pm_occurrences_plan_due_date_unique").on(table.planId, table.dueDate),
    uniqueIndex("pm_occurrences_work_order_unique").on(table.workOrderId),
  ],
);

export const vendorCategories = pgTable(
  "vendor_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("vendor_categories_org_slug_unique").on(table.organizationId, table.slug)],
);

export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  legalName: text("legal_name"),
  isActive: boolean("is_active").notNull().default(true),
  isPreferred: boolean("is_preferred").notNull().default(false),
  primaryPhone: text("primary_phone"),
  primaryEmail: text("primary_email"),
  website: text("website"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country"),
  accountNumber: text("account_number"),
  notes: text("notes"),
  // 'all' = can service every property in the org; 'specific' = only the
  // properties explicitly listed in vendor_property_coverage. No geo/radius
  // routing — an explicit, queryable model instead.
  coverageMode: text("coverage_mode").notNull().default("all"),
  insuranceExpiresAt: date("insurance_expires_at"),
  licenseExpiresAt: date("license_expires_at"),
  contractExpiresAt: date("contract_expires_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vendorCategoryLinks = pgTable(
  "vendor_category_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => vendorCategories.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("vendor_category_links_vendor_category_unique").on(table.vendorId, table.categoryId),
  ],
);

// Backs coverageMode 'specific' — irrelevant rows may exist for a vendor
// currently set to 'all' (harmless; simply unused until switched back).
export const vendorPropertyCoverage = pgTable(
  "vendor_property_coverage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("vendor_property_coverage_vendor_property_unique").on(table.vendorId, table.propertyId),
  ],
);

export const vendorContacts = pgTable("vendor_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  vendorId: uuid("vendor_id")
    .notNull()
    .references(() => vendors.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  title: text("title"),
  email: text("email"),
  phone: text("phone"),
  mobilePhone: text("mobile_phone"),
  notes: text("notes"),
  isPrimary: boolean("is_primary").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inspectionCategories = pgTable(
  "inspection_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("inspection_categories_org_slug_unique").on(table.organizationId, table.slug),
  ],
);

export const inspectionTemplates = pgTable("inspection_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => inspectionCategories.id, { onDelete: "restrict" }),
  propertyTypeId: uuid("property_type_id").references(() => propertyTypes.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inspectionTemplateItems = pgTable("inspection_template_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  templateId: uuid("template_id")
    .notNull()
    .references(() => inspectionTemplates.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  description: text("description"),
  // 'pass_fail' | 'yes_no' | 'text' | 'numeric' | 'date' | 'choice' — kept a
  // small fixed vocabulary rather than a generalized form-builder engine.
  responseType: text("response_type").notNull(),
  isRequired: boolean("is_required").notNull().default(true),
  allowNote: boolean("allow_note").notNull().default(true),
  // Only populated (and only meaningful) when responseType === 'choice'.
  choices: jsonb("choices").$type<string[]>(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inspections = pgTable("inspections", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  propertyEquipmentId: uuid("property_equipment_id").references(() => propertyEquipment.id, {
    onDelete: "set null",
  }),
  templateId: uuid("template_id")
    .notNull()
    .references(() => inspectionTemplates.id, { onDelete: "restrict" }),
  // Snapshot: the template's name at the time this inspection was created, so
  // the header stays meaningful even if the template is later renamed.
  templateName: text("template_name").notNull(),
  status: text("status").notNull().default("draft"),
  scheduledDate: date("scheduled_date"),
  // Optional time-of-day scheduling (PROP-10), additive alongside the
  // date-only scheduledDate above. When set, the inspection projects onto
  // the Operations Calendar as a timed event instead of an all-day one.
  scheduledStartAt: timestamp("scheduled_start_at", { withTimezone: true }),
  scheduledEndAt: timestamp("scheduled_end_at", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  inspectorUserId: uuid("inspector_user_id").references(() => users.id, { onDelete: "set null" }),
  // 'passed' | 'passed_with_findings' | 'failed' — null until completed.
  overallResult: text("overall_result"),
  summary: text("summary"),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per template item, created when the inspection starts. Every
// item-context field is snapshotted here so a later template edit (renamed,
// reordered, removed item) never rewrites already-recorded history.
export const inspectionResponses = pgTable(
  "inspection_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    inspectionId: uuid("inspection_id")
      .notNull()
      .references(() => inspections.id, { onDelete: "cascade" }),
    templateItemId: uuid("template_item_id").references(() => inspectionTemplateItems.id, {
      onDelete: "set null",
    }),
    itemLabel: text("item_label").notNull(),
    itemDescription: text("item_description"),
    itemResponseType: text("item_response_type").notNull(),
    itemRequired: boolean("item_required").notNull().default(true),
    itemAllowNote: boolean("item_allow_note").notNull().default(true),
    itemChoices: jsonb("item_choices").$type<string[]>(),
    itemSortOrder: integer("item_sort_order").notNull().default(0),
    // Normalized as text regardless of response type (numeric/date included) —
    // deliberately simple rather than a polymorphic multi-column value store.
    value: text("value"),
    // 'pass' | 'fail' — only ever set for itemResponseType === 'pass_fail'.
    // Other response types carry no derived pass/fail semantics.
    outcome: text("outcome"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("inspection_responses_inspection_item_unique").on(
      table.inspectionId,
      table.templateItemId,
    ),
  ],
);

export const complianceRecords = pgTable("compliance_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  // Fixed constant list (see lib/compliance/constants.ts) rather than a
  // configurable taxonomy table — this domain doesn't need per-org categories.
  category: text("category").notNull(),
  name: text("name").notNull(),
  issuer: text("issuer"),
  issuedDate: date("issued_date"),
  expirationDate: date("expiration_date"),
  // Record lifecycle (active/superseded), independent of the derived
  // expiration status (current/expiring_soon/expired) computed at read time.
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  tenantType: text("tenant_type").notNull().default("individual"),
  name: text("name").notNull(),
  legalName: text("legal_name"),
  isActive: boolean("is_active").notNull().default(true),
  primaryPhone: text("primary_phone"),
  primaryEmail: text("primary_email"),
  website: text("website"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tenantContacts = pgTable("tenant_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  title: text("title"),
  email: text("email"),
  phone: text("phone"),
  mobilePhone: text("mobile_phone"),
  notes: text("notes"),
  isPrimary: boolean("is_primary").notNull().default(false),
  isEmergencyContact: boolean("is_emergency_contact").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// The relationship between Tenant and Property — a Property never carries a
// tenant reference directly, and a Tenant may have multiple leases (historical
// or, if the business needs it, concurrent) across one or more properties.
export const leases = pgTable("leases", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  label: text("label").notNull(),
  leaseType: text("lease_type").notNull().default("residential"),
  // Small lifecycle enum — only the states nothing else can derive
  // (draft/month_to_month/terminated). 'active' plus the dates below is
  // enough to derive upcoming/active/expired at read time (see
  // lib/leases/status.ts) without a cron flipping stored state.
  status: text("status").notNull().default("draft"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  noticeDate: date("notice_date"),
  renewalOptionDate: date("renewal_option_date"),
  moveInDate: date("move_in_date"),
  moveOutDate: date("move_out_date"),
  // Informational only in PROP-9 — no ledger, no payment processing.
  securityDeposit: numeric("security_deposit", { precision: 10, scale: 2, mode: "number" }),
  baseRent: numeric("base_rent", { precision: 10, scale: 2, mode: "number" }),
  rentFrequency: text("rent_frequency"),
  squareFootageLeased: integer("square_footage_leased"),
  // Preserved as-is for backward compatibility — never removed, renamed, or
  // auto-matched to propertyUnitId (POLISH-2). Both fields stay independently
  // editable; propertyUnitId is the source of truth once set.
  unitLabel: text("unit_label"),
  propertyUnitId: uuid("property_unit_id").references(() => propertyUnits.id, {
    onDelete: "set null",
  }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Manual Operations Calendar entries (PROP-10) — the only calendar-owned
// source of record. Everything else on the calendar is projected read-only
// from its own module's tables (work orders, PM, inspections, compliance,
// leases); this table exists solely for events with no other home.
export const operationalEvents = pgTable("operational_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }),
  allDay: boolean("all_day").notNull().default(false),
  status: text("status").notNull().default("active"),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  beforeData: jsonb("before_data"),
  afterData: jsonb("after_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
