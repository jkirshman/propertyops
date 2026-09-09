import { EntityDocumentsPanel } from "@/components/shared/EntityDocumentsPanel";
import { TENANT_FILES_ENTITY_TYPE } from "@/lib/tenants/constants";

export function TenantDocumentsPanel({ tenantId, canManage }: { tenantId: string; canManage: boolean }) {
  return (
    <EntityDocumentsPanel
      relatedEntityType={TENANT_FILES_ENTITY_TYPE}
      relatedEntityId={tenantId}
      canManage={canManage}
    />
  );
}
