import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { organizations } from "@/db/schema";

const DEFAULT_TIMEZONE = "America/Detroit";

export async function getOrganizationTimezone(organizationId: string): Promise<string> {
  const [row] = await db
    .select({ timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  return row?.timezone ?? DEFAULT_TIMEZONE;
}
