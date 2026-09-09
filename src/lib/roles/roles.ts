import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { roles } from "@/db/schema";
import { getRoleCapabilityKeys } from "@/lib/auth/capabilities";

export type RoleRow = typeof roles.$inferSelect;

export interface RoleWithCapabilities extends RoleRow {
  capabilityKeys: string[];
}

export async function listRoles(organizationId: string): Promise<RoleRow[]> {
  return db.select().from(roles).where(eq(roles.organizationId, organizationId)).orderBy(asc(roles.name));
}

export async function getRole(organizationId: string, id: string): Promise<RoleRow | null> {
  const [row] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, id), eq(roles.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

/** Roles-admin read model: every org role plus its resolved capability keys, for read-only inspection. */
export async function listRolesWithCapabilities(organizationId: string): Promise<RoleWithCapabilities[]> {
  const roleRows = await listRoles(organizationId);
  return Promise.all(
    roleRows.map(async (role) => ({ ...role, capabilityKeys: await getRoleCapabilityKeys(role.id) })),
  );
}
