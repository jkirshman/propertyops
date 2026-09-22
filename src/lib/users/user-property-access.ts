import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { properties, propertyUnits, userPropertyAccess } from "@/db/schema";

export interface UserPropertyAccessRow {
  id: string;
  propertyId: string;
  propertyName: string;
  propertyUnitId: string | null;
  unitLabel: string | null;
  createdAt: Date;
}

/** ACCESS-1 admin UI: every Property/Unit access row assigned to one user. */
export async function listUserPropertyAccess(
  organizationId: string,
  userId: string,
): Promise<UserPropertyAccessRow[]> {
  return db
    .select({
      id: userPropertyAccess.id,
      propertyId: userPropertyAccess.propertyId,
      propertyName: properties.name,
      propertyUnitId: userPropertyAccess.propertyUnitId,
      unitLabel: propertyUnits.unitLabel,
      createdAt: userPropertyAccess.createdAt,
    })
    .from(userPropertyAccess)
    .innerJoin(properties, eq(properties.id, userPropertyAccess.propertyId))
    .leftJoin(propertyUnits, eq(propertyUnits.id, userPropertyAccess.propertyUnitId))
    .where(and(eq(userPropertyAccess.organizationId, organizationId), eq(userPropertyAccess.userId, userId)))
    .orderBy(asc(properties.name));
}

/**
 * Pre-insert existence check, used to return a friendly `already_assigned`
 * response instead of relying on the schema's partial unique indexes to
 * reject the insert with a raw DB error.
 */
export async function findUserPropertyAccess(
  organizationId: string,
  userId: string,
  propertyId: string,
  propertyUnitId: string | null,
) {
  const [row] = await db
    .select({ id: userPropertyAccess.id })
    .from(userPropertyAccess)
    .where(
      and(
        eq(userPropertyAccess.organizationId, organizationId),
        eq(userPropertyAccess.userId, userId),
        eq(userPropertyAccess.propertyId, propertyId),
        propertyUnitId === null
          ? isNull(userPropertyAccess.propertyUnitId)
          : eq(userPropertyAccess.propertyUnitId, propertyUnitId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function addUserPropertyAccess(params: {
  organizationId: string;
  userId: string;
  propertyId: string;
  propertyUnitId: string | null;
  createdByUserId: string;
}) {
  const [row] = await db
    .insert(userPropertyAccess)
    .values({
      organizationId: params.organizationId,
      userId: params.userId,
      propertyId: params.propertyId,
      propertyUnitId: params.propertyUnitId,
      createdByUserId: params.createdByUserId,
    })
    .returning();
  return row;
}

export async function removeUserPropertyAccess(
  organizationId: string,
  userId: string,
  accessId: string,
) {
  const [row] = await db
    .delete(userPropertyAccess)
    .where(
      and(
        eq(userPropertyAccess.id, accessId),
        eq(userPropertyAccess.organizationId, organizationId),
        eq(userPropertyAccess.userId, userId),
      ),
    )
    .returning();
  return row ?? null;
}
