import { EntityDocumentsPanel } from "@/components/shared/EntityDocumentsPanel";
import { LEASE_FILES_ENTITY_TYPE } from "@/lib/leases/constants";

export function LeaseDocumentsPanel({ leaseId, canManage }: { leaseId: string; canManage: boolean }) {
  return (
    <EntityDocumentsPanel
      relatedEntityType={LEASE_FILES_ENTITY_TYPE}
      relatedEntityId={leaseId}
      canManage={canManage}
    />
  );
}
