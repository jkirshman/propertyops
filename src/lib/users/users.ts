import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { capabilities, roleCapabilities, users } from "@/db/schema";

/** Minimal read-only projection used to populate assignee/requester pickers. */
export async function listOrganizationUsers(organizationId: string) {
  return db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
    })
    .from(users)
    .where(and(eq(users.organizationId, organizationId), eq(users.isActive, true)))
    .orderBy(asc(users.displayName));
}

/** Active users in the org whose role grants the given capability — used to target notifications at whoever can act on them. */
export async function listUsersWithCapability(organizationId: string, capabilityKey: string) {
  return db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
    })
    .from(users)
    .innerJoin(roleCapabilities, eq(roleCapabilities.roleId, users.roleId))
    .innerJoin(capabilities, eq(capabilities.id, roleCapabilities.capabilityId))
    .where(
      and(
        eq(users.organizationId, organizationId),
        eq(users.isActive, true),
        eq(capabilities.key, capabilityKey),
      ),
    )
    .orderBy(asc(users.displayName));
}
