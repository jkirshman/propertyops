import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { propertyContacts } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import { PROPERTY_CAPABILITIES } from "@/lib/properties/constants";
import type {
  CreatePropertyContactInput,
  UpdatePropertyContactInput,
} from "@/lib/validation/property-contacts";

/**
 * ACCESS-1 contact ownership: MANAGE_CONTACTS holders (Admin/Manager) may
 * edit any contact. A CREATE_CONTACT-only holder (User) may edit only a
 * contact they created themselves — a legacy contact with no
 * `createdByUserId` (pre-ACCESS-1, or created by an Admin/Manager) is treated
 * as authoritative and falls through to false for them, with no special-casing
 * needed since `null !== currentUserId` already.
 */
export function canEditPropertyContact(
  capabilityKeys: string[],
  contact: { createdByUserId: string | null },
  currentUserId: string,
): boolean {
  if (capabilityKeys.includes(PROPERTY_CAPABILITIES.MANAGE_CONTACTS)) {
    return true;
  }
  return (
    capabilityKeys.includes(PROPERTY_CAPABILITIES.CREATE_CONTACT) &&
    contact.createdByUserId === currentUserId
  );
}

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
  createdByUserId: string,
  input: CreatePropertyContactInput,
) {
  const [row] = await db
    .insert(propertyContacts)
    .values({
      organizationId,
      propertyId,
      name: input.name,
      contactType: input.contactType,
      title: input.title ?? null,
      company: input.company ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      mobilePhone: input.mobilePhone ?? null,
      notes: input.notes ?? null,
      isPrimary: input.isPrimary ?? false,
      createdByUserId,
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
