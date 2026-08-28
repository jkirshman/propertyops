import { and, asc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/db/client";
import { people } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type { CreatePersonInput, UpdatePersonInput } from "@/lib/validation/people";

export interface ListPeopleOptions {
  search?: string;
  isActive?: boolean;
}

export async function listPeople(organizationId: string, options: ListPeopleOptions = {}) {
  const conditions = [eq(people.organizationId, organizationId)];

  if (options.isActive !== undefined) {
    conditions.push(eq(people.isActive, options.isActive));
  }

  if (options.search) {
    const term = `%${options.search.trim()}%`;
    conditions.push(
      or(
        ilike(people.displayName, term),
        ilike(people.email, term),
        ilike(people.referenceNumber, term),
      )!,
    );
  }

  return db
    .select()
    .from(people)
    .where(and(...conditions))
    .orderBy(asc(people.displayName));
}

export async function getPerson(organizationId: string, id: string) {
  const [row] = await db
    .select()
    .from(people)
    .where(and(eq(people.id, id), eq(people.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function createPerson(organizationId: string, input: CreatePersonInput) {
  const [row] = await db
    .insert(people)
    .values({
      organizationId,
      firstName: input.firstName,
      lastName: input.lastName,
      displayName: `${input.firstName} ${input.lastName}`.trim(),
      email: input.email ?? null,
      phone: input.phone ?? null,
      referenceNumber: input.referenceNumber ?? null,
      linkedUserId: input.linkedUserId ?? null,
    })
    .returning();
  return row;
}

export async function updatePerson(organizationId: string, id: string, input: UpdatePersonInput) {
  const { firstName, lastName, ...rest } = input;
  const existing = firstName !== undefined || lastName !== undefined ? await getPerson(organizationId, id) : null;

  const displayName =
    firstName !== undefined || lastName !== undefined
      ? `${firstName ?? existing?.firstName ?? ""} ${lastName ?? existing?.lastName ?? ""}`.trim()
      : undefined;

  const [row] = await db
    .update(people)
    .set({
      ...stripUndefined({ ...rest, firstName, lastName, displayName }),
      updatedAt: new Date(),
    })
    .where(and(eq(people.id, id), eq(people.organizationId, organizationId)))
    .returning();
  return row ?? null;
}
