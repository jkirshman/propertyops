import { EntityDocumentsPanel } from "@/components/shared/EntityDocumentsPanel";
import { VENDOR_FILES_ENTITY_TYPE } from "@/lib/vendors/constants";

export function VendorDocumentsPanel({ vendorId, canManage }: { vendorId: string; canManage: boolean }) {
  return (
    <EntityDocumentsPanel
      relatedEntityType={VENDOR_FILES_ENTITY_TYPE}
      relatedEntityId={vendorId}
      canManage={canManage}
    />
  );
}
