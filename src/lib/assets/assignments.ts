import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { assetAssignments, assets } from "@/db/schema";
import { ASSET_TERMINAL_STATUSES, type AssetAssignmentType, type AssetStatus } from "@/lib/assets/constants";
import { getAsset } from "@/lib/assets/assets";
import { getPerson } from "@/lib/people/people";
import { getProperty } from "@/lib/properties/properties";
import type { MoveAssetInput } from "@/lib/validation/asset-assignments";

export class AssetMoveError extends Error {
  constructor(public code: "not_found" | "asset_retired" | "invalid_target") {
    super(code);
  }
}

/** Pure check, independent of the database: retired/disposed assets are a dead end for movement. */
export function isAssetMovable(status: string): boolean {
  return !ASSET_TERMINAL_STATUSES.includes(status as AssetStatus);
}

/**
 * Pure computation of the asset-row fields a move produces, independent of
 * the database so it's cheaply testable. 'lost' is treated as recoverable —
 * any successful move (including a plain return) implies the asset was
 * found, so status resets to the normal available/assigned pair.
 */
export function computeAssetStateForMove(
  targetType: AssetAssignmentType,
  personId?: string | null,
  propertyId?: string | null,
): {
  assignmentType: AssetAssignmentType;
  assignedPersonId: string | null;
  assignedPropertyId: string | null;
  status: AssetStatus;
} {
  return {
    assignmentType: targetType,
    assignedPersonId: targetType === "person" ? (personId ?? null) : null,
    assignedPropertyId: targetType === "property" ? (propertyId ?? null) : null,
    status: targetType === "unassigned" ? "available" : "assigned",
  };
}

/**
 * The single primitive behind assign, transfer, and return: closes the
 * currently-active assignment history row (if any) and, unless the target is
 * "unassigned", opens a new one. History rows are never rewritten — only
 * closed — so past custody is always reconstructable.
 */
export async function moveAsset(
  organizationId: string,
  assetId: string,
  actorUserId: string,
  input: MoveAssetInput,
) {
  const asset = await getAsset(organizationId, assetId);
  if (!asset) {
    throw new AssetMoveError("not_found");
  }
  if (!isAssetMovable(asset.status)) {
    throw new AssetMoveError("asset_retired");
  }

  if (input.targetType === "person") {
    const person = await getPerson(organizationId, input.personId!);
    if (!person) {
      throw new AssetMoveError("invalid_target");
    }
  }
  if (input.targetType === "property") {
    const property = await getProperty(organizationId, input.propertyId!);
    if (!property) {
      throw new AssetMoveError("invalid_target");
    }
  }

  const now = new Date();
  let closedAssignmentId: string | null = null;

  if (asset.currentAssignmentId) {
    const [closed] = await db
      .update(assetAssignments)
      .set({
        returnedAt: now,
        returnedByUserId: actorUserId,
        returnNotes: input.notes ?? null,
      })
      .where(
        and(
          eq(assetAssignments.id, asset.currentAssignmentId),
          eq(assetAssignments.organizationId, organizationId),
        ),
      )
      .returning({ id: assetAssignments.id });
    closedAssignmentId = closed?.id ?? null;
  }

  let newAssignmentId: string | null = null;
  if (input.targetType !== "unassigned") {
    const [created] = await db
      .insert(assetAssignments)
      .values({
        organizationId,
        assetId,
        assignmentType: input.targetType,
        personId: input.targetType === "person" ? input.personId : null,
        propertyId: input.targetType === "property" ? input.propertyId : null,
        assignedAt: now,
        assignedByUserId: actorUserId,
        notes: input.notes ?? null,
      })
      .returning();
    newAssignmentId = created.id;
  }

  const nextState = computeAssetStateForMove(input.targetType, input.personId, input.propertyId);

  const [updated] = await db
    .update(assets)
    .set({
      ...nextState,
      currentAssignmentId: newAssignmentId,
      updatedAt: now,
    })
    .where(and(eq(assets.id, assetId), eq(assets.organizationId, organizationId)))
    .returning();

  return { asset: updated, closedAssignmentId, newAssignmentId };
}

export async function listAssetAssignmentHistory(organizationId: string, assetId: string) {
  return db
    .select()
    .from(assetAssignments)
    .where(and(eq(assetAssignments.organizationId, organizationId), eq(assetAssignments.assetId, assetId)))
    .orderBy(desc(assetAssignments.assignedAt));
}

export async function listPersonAssignmentHistory(organizationId: string, personId: string) {
  return db
    .select()
    .from(assetAssignments)
    .where(and(eq(assetAssignments.organizationId, organizationId), eq(assetAssignments.personId, personId)))
    .orderBy(desc(assetAssignments.assignedAt));
}

export async function listPropertyAssignmentHistory(organizationId: string, propertyId: string) {
  return db
    .select()
    .from(assetAssignments)
    .where(
      and(eq(assetAssignments.organizationId, organizationId), eq(assetAssignments.propertyId, propertyId)),
    )
    .orderBy(desc(assetAssignments.assignedAt));
}
