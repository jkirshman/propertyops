import Link from "next/link";
import { notFound } from "next/navigation";

import { AssetDetailPanel } from "@/components/assets/AssetDetailPanel";
import { getAsset } from "@/lib/assets/assets";
import { getAssetCategory } from "@/lib/assets/categories";
import { ASSET_CAPABILITIES, ASSET_STATUS_LABELS, type AssetStatus } from "@/lib/assets/constants";
import { requireCapability } from "@/lib/auth/require-capability";
import { WORK_ORDER_CAPABILITIES } from "@/lib/work-orders/constants";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await requireCapability(ASSET_CAPABILITIES.VIEW, "/assets");

  const asset = await getAsset(context.user.organizationId, id);
  if (!asset) {
    notFound();
  }

  const category = await getAssetCategory(context.user.organizationId, asset.categoryId);
  const { capabilityKeys } = context;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div className="muted" style={{ fontSize: "0.85rem" }}>{asset.assetTag}</div>
          <h1 style={{ marginBottom: "0.3rem" }}>{asset.displayName}</h1>
          <div className="muted" style={{ fontSize: "0.9rem" }}>
            {category?.name ?? "Unknown category"}
            {" · "}
            {ASSET_STATUS_LABELS[asset.status as AssetStatus] ?? asset.status}
            {!asset.isActive ? " · Inactive" : ""}
          </div>
        </div>
        {capabilityKeys.includes(ASSET_CAPABILITIES.EDIT) ? (
          <Link href={`/assets/${asset.id}/edit`} className="button">
            Edit
          </Link>
        ) : null}
      </div>

      <AssetDetailPanel
        initialAsset={{
          id: asset.id,
          assetTag: asset.assetTag,
          displayName: asset.displayName,
          manufacturer: asset.manufacturer,
          model: asset.model,
          serialNumber: asset.serialNumber,
          status: asset.status,
          condition: asset.condition,
          isActive: asset.isActive,
          acquiredDate: asset.acquiredDate,
          purchaseCost: asset.purchaseCost,
          warrantyExpiration: asset.warrantyExpiration,
          retiredDate: asset.retiredDate,
          disposalReason: asset.disposalReason,
          notes: asset.notes,
          assignmentType: asset.assignmentType,
          assignedPersonId: asset.assignedPersonId,
          assignedPropertyId: asset.assignedPropertyId,
        }}
        canEdit={capabilityKeys.includes(ASSET_CAPABILITIES.EDIT)}
        canAssign={capabilityKeys.includes(ASSET_CAPABILITIES.ASSIGN)}
        canRetire={capabilityKeys.includes(ASSET_CAPABILITIES.RETIRE)}
        canManageDocuments={capabilityKeys.includes(ASSET_CAPABILITIES.MANAGE_DOCUMENTS)}
        canCreateWorkOrders={capabilityKeys.includes(WORK_ORDER_CAPABILITIES.CREATE)}
      />
    </div>
  );
}
