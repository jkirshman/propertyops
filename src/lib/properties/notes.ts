import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { propertyNotes } from "@/db/schema";
import type { CreatePropertyNoteInput } from "@/lib/validation/property-notes";

export async function listPropertyNotes(organizationId: string, propertyId: string) {
  return db
    .select()
    .from(propertyNotes)
    .where(
      and(eq(propertyNotes.organizationId, organizationId), eq(propertyNotes.propertyId, propertyId)),
    )
    .orderBy(desc(propertyNotes.createdAt));
}

export async function createPropertyNote(
  organizationId: string,
  propertyId: string,
  authorUserId: string,
  input: CreatePropertyNoteInput,
) {
  const [row] = await db
    .insert(propertyNotes)
    .values({
      organizationId,
      propertyId,
      authorUserId,
      body: input.body,
    })
    .returning();
  return row;
}
