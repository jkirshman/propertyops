import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { tenantContacts } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type { CreateTenantContactInput, UpdateTenantContactInput } from "@/lib/validation/tenant-contacts";

export async function listTenantContacts(organizationId: string, tenantId: string) {
  return db
    .select()
    .from(tenantContacts)
    .where(and(eq(tenantContacts.organizationId, organizationId), eq(tenantContacts.tenantId, tenantId)))
    .orderBy(asc(tenantContacts.name));
}

export async function getTenantContact(organizationId: string, tenantId: string, contactId: string) {
  const [row] = await db
    .select()
    .from(tenantContacts)
    .where(
      and(
        eq(tenantContacts.id, contactId),
        eq(tenantContacts.tenantId, tenantId),
        eq(tenantContacts.organizationId, organizationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createTenantContact(
  organizationId: string,
  tenantId: string,
  input: CreateTenantContactInput,
) {
  const [row] = await db
    .insert(tenantContacts)
    .values({
      organizationId,
      tenantId,
      name: input.name,
      title: input.title ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      mobilePhone: input.mobilePhone ?? null,
      notes: input.notes ?? null,
      isPrimary: input.isPrimary ?? false,
      isEmergencyContact: input.isEmergencyContact ?? false,
    })
    .returning();
  return row;
}

export async function updateTenantContact(
  organizationId: string,
  tenantId: string,
  contactId: string,
  input: UpdateTenantContactInput,
) {
  const [row] = await db
    .update(tenantContacts)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(
      and(
        eq(tenantContacts.id, contactId),
        eq(tenantContacts.tenantId, tenantId),
        eq(tenantContacts.organizationId, organizationId),
      ),
    )
    .returning();
  return row ?? null;
}
