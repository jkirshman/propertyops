import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { vendorContacts } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type { CreateVendorContactInput, UpdateVendorContactInput } from "@/lib/validation/vendor-contacts";

export async function listVendorContacts(organizationId: string, vendorId: string) {
  return db
    .select()
    .from(vendorContacts)
    .where(and(eq(vendorContacts.organizationId, organizationId), eq(vendorContacts.vendorId, vendorId)))
    .orderBy(asc(vendorContacts.name));
}

export async function getVendorContact(organizationId: string, vendorId: string, contactId: string) {
  const [row] = await db
    .select()
    .from(vendorContacts)
    .where(
      and(
        eq(vendorContacts.id, contactId),
        eq(vendorContacts.vendorId, vendorId),
        eq(vendorContacts.organizationId, organizationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createVendorContact(
  organizationId: string,
  vendorId: string,
  input: CreateVendorContactInput,
) {
  const [row] = await db
    .insert(vendorContacts)
    .values({
      organizationId,
      vendorId,
      name: input.name,
      title: input.title ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      mobilePhone: input.mobilePhone ?? null,
      notes: input.notes ?? null,
      isPrimary: input.isPrimary ?? false,
    })
    .returning();
  return row;
}

export async function updateVendorContact(
  organizationId: string,
  vendorId: string,
  contactId: string,
  input: UpdateVendorContactInput,
) {
  const [row] = await db
    .update(vendorContacts)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(
      and(
        eq(vendorContacts.id, contactId),
        eq(vendorContacts.vendorId, vendorId),
        eq(vendorContacts.organizationId, organizationId),
      ),
    )
    .returning();
  return row ?? null;
}
