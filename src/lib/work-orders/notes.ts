import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { workOrderNotes } from "@/db/schema";
import type { CreateWorkOrderNoteInput } from "@/lib/validation/work-order-notes";

export async function listWorkOrderNotes(organizationId: string, workOrderId: string) {
  return db
    .select()
    .from(workOrderNotes)
    .where(
      and(
        eq(workOrderNotes.organizationId, organizationId),
        eq(workOrderNotes.workOrderId, workOrderId),
      ),
    )
    .orderBy(desc(workOrderNotes.createdAt));
}

export async function createWorkOrderNote(
  organizationId: string,
  workOrderId: string,
  authorUserId: string,
  input: CreateWorkOrderNoteInput,
) {
  const [row] = await db
    .insert(workOrderNotes)
    .values({
      organizationId,
      workOrderId,
      authorUserId,
      body: input.body,
      visibility: "internal",
    })
    .returning();
  return row;
}
