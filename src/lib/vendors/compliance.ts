// Lightweight compliance visibility only — no renewal workflow, no automatic
// re-verification. A 30-day lead time is a reasonable default for
// paperwork-style expirations (insurance/license/contract), longer than PM's
// 14-day due-soon threshold since these renewals typically need more lead time.
export const VENDOR_COMPLIANCE_EXPIRING_SOON_DAYS = 30;

export const VENDOR_COMPLIANCE_STATUSES = ["none", "ok", "expiring_soon", "expired"] as const;
export type VendorComplianceStatus = (typeof VENDOR_COMPLIANCE_STATUSES)[number];

export const VENDOR_COMPLIANCE_STATUS_LABELS: Record<VendorComplianceStatus, string> = {
  none: "Not on file",
  ok: "Current",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
};

/** Pure, testable classification of a single compliance date against today. */
export function classifyComplianceStatus(
  expiresAt: string | null,
  today: string = new Date().toISOString().slice(0, 10),
  expiringSoonDays: number = VENDOR_COMPLIANCE_EXPIRING_SOON_DAYS,
): VendorComplianceStatus {
  if (!expiresAt) {
    return "none";
  }
  if (expiresAt < today) {
    return "expired";
  }

  const thresholdDate = new Date(`${today}T00:00:00.000Z`);
  thresholdDate.setUTCDate(thresholdDate.getUTCDate() + expiringSoonDays);
  const thresholdString = thresholdDate.toISOString().slice(0, 10);

  return expiresAt <= thresholdString ? "expiring_soon" : "ok";
}
