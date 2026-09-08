import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import { properties, vendorPropertyCoverage, vendors } from "@/db/schema";
import { attachCategories, type VendorRow } from "./vendors";

/** True if `vendor` may service `propertyId` — always true for coverageMode 'all'. */
export async function vendorCoversProperty(
  organizationId: string,
  vendor: VendorRow,
  propertyId: string,
): Promise<boolean> {
  if (vendor.coverageMode !== "specific") {
    return true;
  }
  return isPropertyCoveredByVendor(organizationId, vendor.id, propertyId);
}

export async function listVendorCoverage(organizationId: string, vendorId: string) {
  return db
    .select({
      id: vendorPropertyCoverage.id,
      propertyId: vendorPropertyCoverage.propertyId,
      propertyName: properties.name,
    })
    .from(vendorPropertyCoverage)
    .innerJoin(properties, eq(properties.id, vendorPropertyCoverage.propertyId))
    .where(
      and(
        eq(vendorPropertyCoverage.organizationId, organizationId),
        eq(vendorPropertyCoverage.vendorId, vendorId),
      ),
    );
}

export async function isPropertyCoveredByVendor(
  organizationId: string,
  vendorId: string,
  propertyId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: vendorPropertyCoverage.id })
    .from(vendorPropertyCoverage)
    .where(
      and(
        eq(vendorPropertyCoverage.organizationId, organizationId),
        eq(vendorPropertyCoverage.vendorId, vendorId),
        eq(vendorPropertyCoverage.propertyId, propertyId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function addVendorCoverage(organizationId: string, vendorId: string, propertyId: string) {
  const [row] = await db
    .insert(vendorPropertyCoverage)
    .values({ organizationId, vendorId, propertyId })
    .onConflictDoNothing({
      target: [vendorPropertyCoverage.vendorId, vendorPropertyCoverage.propertyId],
    })
    .returning();
  return row ?? null;
}

export async function removeVendorCoverage(
  organizationId: string,
  vendorId: string,
  propertyId: string,
) {
  await db
    .delete(vendorPropertyCoverage)
    .where(
      and(
        eq(vendorPropertyCoverage.organizationId, organizationId),
        eq(vendorPropertyCoverage.vendorId, vendorId),
        eq(vendorPropertyCoverage.propertyId, propertyId),
      ),
    );
}

/** Vendors (org-scoped) that can service a given property: coverageMode 'all', or 'specific' with an explicit coverage row. */
export async function listVendorsCoveringProperty(organizationId: string, propertyId: string) {
  const coverageRows = await db
    .select({ vendorId: vendorPropertyCoverage.vendorId })
    .from(vendorPropertyCoverage)
    .where(
      and(
        eq(vendorPropertyCoverage.organizationId, organizationId),
        eq(vendorPropertyCoverage.propertyId, propertyId),
      ),
    );
  const coveredVendorIds = coverageRows.map((row) => row.vendorId);

  const allVendorsRows = await db
    .select({ id: vendors.id })
    .from(vendors)
    .where(
      and(
        eq(vendors.organizationId, organizationId),
        eq(vendors.coverageMode, "all"),
        eq(vendors.isActive, true),
      ),
    );
  const allModeVendorIds = allVendorsRows.map((row) => row.id);

  const matchingIds = Array.from(new Set([...coveredVendorIds, ...allModeVendorIds]));
  if (matchingIds.length === 0) {
    return [];
  }

  const rows = await db
    .select()
    .from(vendors)
    .where(and(inArray(vendors.id, matchingIds), eq(vendors.isActive, true)));

  return attachCategories(organizationId, rows);
}
