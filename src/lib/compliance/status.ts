// Lightweight compliance visibility only — no renewal workflow, no automatic
// re-verification. Status is always derived from expirationDate at read
// time, never stored, so it can never go stale.
export const COMPLIANCE_EXPIRING_SOON_DAYS = 30;

export const COMPLIANCE_STATUSES = ["current", "expiring_soon", "expired", "no_expiration"] as const;
export type ComplianceStatus = (typeof COMPLIANCE_STATUSES)[number];

export const COMPLIANCE_STATUS_LABELS: Record<ComplianceStatus, string> = {
  current: "Current",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
  no_expiration: "No Expiration",
};

/** Pure, testable classification of a compliance record's expiration date against today. */
export function classifyComplianceRecordStatus(
  expirationDate: string | null,
  today: string = new Date().toISOString().slice(0, 10),
  expiringSoonDays: number = COMPLIANCE_EXPIRING_SOON_DAYS,
): ComplianceStatus {
  if (!expirationDate) {
    return "no_expiration";
  }
  if (expirationDate < today) {
    return "expired";
  }

  const thresholdDate = new Date(`${today}T00:00:00.000Z`);
  thresholdDate.setUTCDate(thresholdDate.getUTCDate() + expiringSoonDays);
  const thresholdString = thresholdDate.toISOString().slice(0, 10);

  return expirationDate <= thresholdString ? "expiring_soon" : "current";
}
