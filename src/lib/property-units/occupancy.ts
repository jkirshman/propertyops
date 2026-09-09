import { getEffectiveLeaseStatus } from "@/lib/leases/status";
import type { LeaseStatus } from "@/lib/leases/constants";

export interface UnitOccupancyLease {
  id: string;
  tenantId: string;
  status: string;
  startDate: string;
  endDate: string | null;
}

export interface UnitOccupancy {
  occupied: boolean;
  leaseId: string | null;
  tenantId: string | null;
}

/**
 * Occupancy is never stored — always derived from whether any of the unit's
 * leases is currently active/month-to-month at read time. Draft, upcoming,
 * expired, and terminated leases never count as occupying.
 */
export function deriveUnitOccupancy(leases: UnitOccupancyLease[], today?: string): UnitOccupancy {
  const activeLease = leases.find((lease) => {
    const effective = getEffectiveLeaseStatus(lease.status as LeaseStatus, lease.startDate, lease.endDate, today);
    return effective === "active" || effective === "month_to_month";
  });

  return activeLease
    ? { occupied: true, leaseId: activeLease.id, tenantId: activeLease.tenantId }
    : { occupied: false, leaseId: null, tenantId: null };
}
