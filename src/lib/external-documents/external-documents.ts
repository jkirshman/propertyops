import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { externalDocumentLinks } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type {
  CreateExternalDocumentLinkInput,
  UpdateExternalDocumentLinkInput,
} from "@/lib/validation/external-documents";

export type ExternalDocumentLinkRow = typeof externalDocumentLinks.$inferSelect;

export async function listExternalDocumentLinks(
  organizationId: string,
  related: { relatedEntityType: string; relatedEntityId: string },
): Promise<ExternalDocumentLinkRow[]> {
  return db
    .select()
    .from(externalDocumentLinks)
    .where(
      and(
        eq(externalDocumentLinks.organizationId, organizationId),
        eq(externalDocumentLinks.relatedEntityType, related.relatedEntityType),
        eq(externalDocumentLinks.relatedEntityId, related.relatedEntityId),
      ),
    )
    .orderBy(desc(externalDocumentLinks.createdAt));
}

export async function getExternalDocumentLink(
  organizationId: string,
  id: string,
): Promise<ExternalDocumentLinkRow | null> {
  const [row] = await db
    .select()
    .from(externalDocumentLinks)
    .where(and(eq(externalDocumentLinks.id, id), eq(externalDocumentLinks.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function createExternalDocumentLink(
  organizationId: string,
  createdByUserId: string,
  input: CreateExternalDocumentLinkInput,
): Promise<ExternalDocumentLinkRow> {
  const [row] = await db
    .insert(externalDocumentLinks)
    .values({
      organizationId,
      createdByUserId,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      displayName: input.displayName,
      externalUrl: input.externalUrl,
      category: input.category ?? null,
      description: input.description ?? null,
    })
    .returning();
  return row;
}

export async function updateExternalDocumentLink(
  organizationId: string,
  id: string,
  input: UpdateExternalDocumentLinkInput,
): Promise<ExternalDocumentLinkRow | null> {
  const [row] = await db
    .update(externalDocumentLinks)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(and(eq(externalDocumentLinks.id, id), eq(externalDocumentLinks.organizationId, organizationId)))
    .returning();
  return row ?? null;
}
