import { config } from "dotenv";
import { and, eq } from "drizzle-orm";

config({ path: ".env.local" });

import { db } from "../src/db/client";
import {
  capabilities,
  organizations,
  propertyTypes,
  roleCapabilities,
  roles,
  users,
  workOrderCategories,
} from "../src/db/schema";
import { hashPassword } from "../src/lib/auth/password";

const DEFAULT_ORG_SLUG = "default";
const ADMIN_ROLE_SLUG = "administrator";
const ADMIN_CAPABILITY_KEY = "platform.admin";

// Admin Hub tile capabilities. All are granted to the administrator role below;
// future roles can be granted a subset without any schema change.
const ADMIN_HUB_CAPABILITIES = [
  { key: "users.manage", description: "Manage users and access" },
  { key: "roles.manage", description: "Manage roles and capabilities" },
  { key: "system.manage", description: "Manage system/platform settings" },
  { key: "notifications.manage", description: "Administer notifications" },
  { key: "email.manage", description: "Administer transactional email" },
  { key: "files.manage", description: "Administer private file storage" },
];

// Property domain capabilities. All are granted to the administrator role below;
// future roles can be granted a subset without any schema change.
const PROPERTY_CAPABILITIES = [
  { key: "property.view", description: "View properties" },
  { key: "property.create", description: "Create properties" },
  { key: "property.edit", description: "Edit properties" },
  { key: "property.manage_contacts", description: "Manage property contacts" },
  { key: "property.manage_notes", description: "Manage property notes" },
  { key: "property.manage_documents", description: "Manage property documents" },
  { key: "property_type.view", description: "View property types" },
  { key: "property_type.manage", description: "Manage property types" },
];

const DEFAULT_PROPERTY_TYPES = [
  { name: "Residential Rental", slug: "residential-rental", sortOrder: 1 },
  {
    name: "Strip Mall / Multi-Tenant Commercial",
    slug: "strip-mall-multi-tenant-commercial",
    sortOrder: 2,
  },
  { name: "Freestanding Commercial", slug: "freestanding-commercial", sortOrder: 3 },
  { name: "Leased Property", slug: "leased-property", sortOrder: 4 },
];

// Work Order domain capabilities. All are granted to the administrator role below;
// future roles can be granted a subset without any schema change.
const WORK_ORDER_CAPABILITIES = [
  { key: "work_order.view", description: "View work orders" },
  { key: "work_order.create", description: "Create work orders" },
  { key: "work_order.edit", description: "Edit work orders" },
  { key: "work_order.assign", description: "Assign work orders" },
  { key: "work_order.manage_status", description: "Change work order status" },
  { key: "work_order.manage_notes", description: "Manage work order notes" },
  { key: "work_order.manage_attachments", description: "Manage work order attachments" },
  { key: "work_order_category.view", description: "View work order categories" },
  { key: "work_order_category.manage", description: "Manage work order categories" },
];

const DEFAULT_WORK_ORDER_CATEGORIES = [
  { name: "HVAC", slug: "hvac", sortOrder: 1 },
  { name: "Plumbing", slug: "plumbing", sortOrder: 2 },
  { name: "Electrical", slug: "electrical", sortOrder: 3 },
  { name: "Building / General Maintenance", slug: "building-general-maintenance", sortOrder: 4 },
  { name: "Exterior / Grounds", slug: "exterior-grounds", sortOrder: 5 },
  { name: "Safety / Security", slug: "safety-security", sortOrder: 6 },
  { name: "Appliance", slug: "appliance", sortOrder: 7 },
  { name: "Other", slug: "other", sortOrder: 8 },
];

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set to run the seed script.",
    );
  }

  let [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, DEFAULT_ORG_SLUG))
    .limit(1);

  if (!org) {
    [org] = await db
      .insert(organizations)
      .values({ name: "PropertyOps", slug: DEFAULT_ORG_SLUG })
      .returning();
    console.log(`Created organization ${org.id}`);
  }

  let [capability] = await db
    .select()
    .from(capabilities)
    .where(eq(capabilities.key, ADMIN_CAPABILITY_KEY))
    .limit(1);

  if (!capability) {
    [capability] = await db
      .insert(capabilities)
      .values({ key: ADMIN_CAPABILITY_KEY, description: "Full platform administration" })
      .returning();
    console.log(`Created capability ${capability.id}`);
  }

  let [adminRole] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.organizationId, org.id), eq(roles.slug, ADMIN_ROLE_SLUG)))
    .limit(1);

  if (!adminRole) {
    [adminRole] = await db
      .insert(roles)
      .values({ organizationId: org.id, name: "Administrator", slug: ADMIN_ROLE_SLUG })
      .returning();
    console.log(`Created role ${adminRole.id}`);
  }

  await db
    .insert(roleCapabilities)
    .values({ roleId: adminRole.id, capabilityId: capability.id })
    .onConflictDoNothing();

  for (const { key, description } of [
    ...ADMIN_HUB_CAPABILITIES,
    ...PROPERTY_CAPABILITIES,
    ...WORK_ORDER_CAPABILITIES,
  ]) {
    let [cap] = await db.select().from(capabilities).where(eq(capabilities.key, key)).limit(1);

    if (!cap) {
      [cap] = await db.insert(capabilities).values({ key, description }).returning();
      console.log(`Created capability ${cap.id} (${key})`);
    }

    await db
      .insert(roleCapabilities)
      .values({ roleId: adminRole.id, capabilityId: cap.id })
      .onConflictDoNothing();
  }

  for (const { name, slug, sortOrder } of DEFAULT_PROPERTY_TYPES) {
    const [existingType] = await db
      .select()
      .from(propertyTypes)
      .where(and(eq(propertyTypes.organizationId, org.id), eq(propertyTypes.slug, slug)))
      .limit(1);

    if (!existingType) {
      const [type] = await db
        .insert(propertyTypes)
        .values({ organizationId: org.id, name, slug, sortOrder })
        .returning();
      console.log(`Created property type ${type.id} (${slug})`);
    }
  }

  for (const { name, slug, sortOrder } of DEFAULT_WORK_ORDER_CATEGORIES) {
    const [existingCategory] = await db
      .select()
      .from(workOrderCategories)
      .where(and(eq(workOrderCategories.organizationId, org.id), eq(workOrderCategories.slug, slug)))
      .limit(1);

    if (!existingCategory) {
      const [category] = await db
        .insert(workOrderCategories)
        .values({ organizationId: org.id, name, slug, sortOrder })
        .returning();
      console.log(`Created work order category ${category.id} (${slug})`);
    }
  }

  const [existingUser] = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  if (existingUser) {
    console.log(`Admin user ${adminEmail} already exists; skipping.`);
    return;
  }

  const { salt, hash } = await hashPassword(adminPassword);
  const [user] = await db
    .insert(users)
    .values({
      organizationId: org.id,
      roleId: adminRole.id,
      email: adminEmail,
      passwordHash: hash,
      passwordSalt: salt,
      displayName: "PropertyOps Admin",
    })
    .returning();

  console.log(`Created admin user ${user.id} (${user.email})`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
