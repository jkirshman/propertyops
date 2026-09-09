import { EntityDocumentsPanel } from "@/components/shared/EntityDocumentsPanel";
import { COMPLIANCE_FILES_ENTITY_TYPE } from "@/lib/compliance/constants";

export function ComplianceDocumentsPanel({
  complianceRecordId,
  canManage,
}: {
  complianceRecordId: string;
  canManage: boolean;
}) {
  return (
    <EntityDocumentsPanel
      relatedEntityType={COMPLIANCE_FILES_ENTITY_TYPE}
      relatedEntityId={complianceRecordId}
      canManage={canManage}
    />
  );
}
