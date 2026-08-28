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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("property_types_org_slug_unique").on(table.organizationId, table.slug)],
);

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  propertyTypeId: uuid("property_type_id")
    .notNull()
    .references(() => propertyTypes.id, { onDelete: "restrict" }),
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
  company: text("company"),
  email: text("email"),
  phone: text("phone"),
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
  notes: text("notes"),
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
