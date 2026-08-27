import { config } from "dotenv";
import { and, eq } from "drizzle-orm";

config({ path: ".env.local" });

import { db } from "../src/db/client";
import { capabilities, organizations, roleCapabilities, roles, users } from "../src/db/schema";
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

  for (const { key, description } of ADMIN_HUB_CAPABILITIES) {
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
