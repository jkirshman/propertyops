export interface FindingSource {
  propertyId: string;
  propertyEquipmentId: string | null;
  itemLabel: string;
  note: string | null;
}

export interface WorkOrderDraftFromFinding {
  propertyId: string;
  propertyEquipmentId: string | undefined;
  subject: string;
  description: string | undefined;
}

/**
 * Builds the prefill for a new Work Order from a failed inspection finding.
 * Pure and explicit — the caller still has to submit the Work Order form
 * themselves; nothing here creates anything. Never invoked automatically.
 */
export function buildWorkOrderDraftFromFinding(finding: FindingSource): WorkOrderDraftFromFinding {
  return {
    propertyId: finding.propertyId,
    propertyEquipmentId: finding.propertyEquipmentId ?? undefined,
    subject: `Inspection finding: ${finding.itemLabel}`,
    description: finding.note?.trim() ? finding.note.trim() : undefined,
  };
}
