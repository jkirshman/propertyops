import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { properties } from "@/db/schema";
import { narrowScopeToPropertyIds, type PropertyScope } from "@/lib/auth/property-access";
import { listInspections } from "@/lib/inspections/inspections";
import { listLeases } from "@/lib/leases/leases";
import { listPreventiveMaintenancePlans } from "@/lib/preventive-maintenance/plans";
import { listOpenWorkOrdersForBrief } from "@/lib/work-orders/work-orders";

import {
  PROPERTY_ARCHIVED_ERROR,
  PROPERTY_ARCHIVED_MESSAGE,
  countActiveLeases,
  countOpenInspections,
  listRequestIncludesArchived,
  type ArchiveImpactCounts,
} from "./archive-rules";

/** LIFECYCLE-1: ids of the organization's non-archived Properties. */
export async function listActivePropertyIds(organizationId: string): Promise<string[]> {
  const rows = await db
    .select({ id: properties.id })
    .from(properties)
    .where(and(eq(properties.organizationId, organizationId), eq(properties.isActive, true)));
  return rows.map((row) => row.id);
}

/**
 * The scope for operational lists and dashboards (Home, Calendar, global
 * lists): the user's access, minus archived Properties. Never use this for
 * authorization — detail pages and record APIs keep the full scope.
 */
export async function resolveOperationalPropertyScope(
  organizationId: string,
  scope: PropertyScope,
): Promise<PropertyScope> {
  return narrowScopeToPropertyIds(scope, await listActivePropertyIds(organizationId));
}

/** For list APIs: full scope for record-history requests, operational scope otherwise. */
export async function resolveListPropertyScope(
  organizationId: string,
  scope: PropertyScope,
  searchParams: URLSearchParams,
): Promise<PropertyScope> {
  return listRequestIncludesArchived(searchParams)
    ? scope
    : resolveOperationalPropertyScope(organizationId, scope);
}

/** 409 for any attempt to create new operational records on an archived Property. */
export function propertyArchivedResponse() {
  return NextResponse.json(
    { error: PROPERTY_ARCHIVED_ERROR, message: PROPERTY_ARCHIVED_MESSAGE },
    { status: 409 },
  );
}

/** True when the Property exists in the org and is not archived. */
export async function isPropertyOperational(organizationId: string, propertyId: string): Promise<boolean> {
  const [row] = await db
    .select({ isActive: properties.isActive })
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.organizationId, organizationId)))
    .limit(1);
  return Boolean(row?.isActive);
}

/** Read-only counts for the archive confirmation — nothing here is modified by archiving. */
export async function getArchiveImpactCounts(
  organizationId: string,
  propertyId: string,
): Promise<ArchiveImpactCounts> {
  const [openWorkOrders, activePlans, inspections, leases] = await Promise.all([
    listOpenWorkOrdersForBrief(organizationId, [propertyId]),
    listPreventiveMaintenancePlans(organizationId, { propertyId, isActive: true }),
    listInspections(organizationId, { propertyId }),
    listLeases(organizationId, { propertyId }),
  ]);
  return {
    openWorkOrders: openWorkOrders.length,
    activePmPlans: activePlans.length,
    openInspections: countOpenInspections(inspections),
    activeLeases: countActiveLeases(leases),
  };
}

/** Flips only the Property's own lifecycle flag — related records are never touched. */
export async function setPropertyActive(organizationId: string, propertyId: string, isActive: boolean) {
  const [row] = await db
    .update(properties)
    .set({ isActive, updatedAt: new Date() })
    .where(and(eq(properties.id, propertyId), eq(properties.organizationId, organizationId)))
    .returning();
  return row ?? null;
}
