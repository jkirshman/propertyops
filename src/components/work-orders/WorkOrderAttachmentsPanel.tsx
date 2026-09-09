import { EntityDocumentsPanel } from "@/components/shared/EntityDocumentsPanel";
import { WORK_ORDER_FILES_ENTITY_TYPE } from "@/lib/work-orders/constants";

export function WorkOrderAttachmentsPanel({
  workOrderId,
  canManage,
}: {
  workOrderId: string;
  canManage: boolean;
}) {
  return (
    <EntityDocumentsPanel
      relatedEntityType={WORK_ORDER_FILES_ENTITY_TYPE}
      relatedEntityId={workOrderId}
      canManage={canManage}
    />
  );
}
