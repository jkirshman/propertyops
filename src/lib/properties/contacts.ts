import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { propertyContacts } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type {
  CreatePropertyContactInput,
  UpdatePropertyContactInput,
} from "@/lib/validation/property-contacts";

export async function listPropertyContacts(organizationId: string, propertyId: string) {
  return db
    .select()
    .from(propertyContacts)
    .where(
      and(
        eq(propertyContacts.organizationId, organizationId),
        eq(propertyContacts.propertyId, propertyId),
      ),
    )
    .orderBy(asc(propertyContacts.name));
}

export async function getPropertyContact(
  organizationId: string,
  propertyId: string,
  contactId: string,
) {
  const [row] = await db
    .select()
    .from(propertyContacts)
    .where(
      and(
        eq(propertyContacts.id, contactId),
        eq(propertyContacts.propertyId, propertyId),
        eq(propertyContacts.organizationId, organizationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createPropertyContact(
  organizationId: string,
  propertyId: string,
  input: CreatePropertyContactInput,
) {
  const [row] = await db
    .insert(propertyContacts)
    .values({
      organizationId,
      propertyId,
      name: input.name,
      contactType: input.contactType,
      company: input.company ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      notes: input.notes ?? null,
      isPrimary: input.isPrimary ?? false,
    })
    .returning();
  return row;
}

export async function updatePropertyContact(
  organizationId: string,
  propertyId: string,
  contactId: string,
  input: UpdatePropertyContactInput,
) {
  const [row] = await db
    .update(propertyContacts)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(
      and(
        eq(propertyContacts.id, contactId),
        eq(propertyContacts.propertyId, propertyId),
        eq(propertyContacts.organizationId, organizationId),
      ),
    )
    .returning();
  return row ?? null;
}
