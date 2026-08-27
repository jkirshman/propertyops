import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { capabilities, roleCapabilities } from "@/db/schema";

/** Pure check, independent of the database — kept separate so it's cheaply testable. */
export function hasCapability(grantedCapabilityKeys: string[], required: string): boolean {
  return grantedCapabilityKeys.includes(required);
}

export async function getRoleCapabilityKeys(roleId: string): Promise<string[]> {
  const rows = await db
    .select({ key: capabilities.key })
    .from(roleCapabilities)
    .innerJoin(capabilities, eq(roleCapabilities.capabilityId, capabilities.id))
    .where(eq(roleCapabilities.roleId, roleId));

  return rows.map((row) => row.key);
}

export async function roleHasCapability(roleId: string, required: string): Promise<boolean> {
  const keys = await getRoleCapabilityKeys(roleId);
  return hasCapability(keys, required);
}
