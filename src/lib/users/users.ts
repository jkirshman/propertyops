import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { users } from "@/db/schema";

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
