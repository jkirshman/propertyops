import { notFound } from "next/navigation";

import { AssetForm } from "@/components/assets/AssetForm";
import { getAsset } from "@/lib/assets/assets";
import { listAssetCategories } from "@/lib/assets/categories";
import { ASSET_CAPABILITIES } from "@/lib/assets/constants";
import { requireCapability } from "@/lib/auth/require-capability";

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await requireCapability(ASSET_CAPABILITIES.EDIT, "/assets");

  const asset = await getAsset(context.user.organizationId, id);
  if (!asset) {
    notFound();
  }

  const categories = await listAssetCategories(context.user.organizationId, { activeOnly: true });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 800 }}>
      <div>
        <h1>Edit Asset</h1>
        <p className="muted">
          {asset.assetTag} · {asset.displayName}
        </p>
      </div>
      <AssetForm
        mode="edit"
        assetId={asset.id}
        categories={categories}
        initialValues={{
          categoryId: asset.categoryId,
          displayName: asset.displayName,
          manufacturer: asset.manufacturer ?? "",
          model: asset.model ?? "",
          serialNumber: asset.serialNumber ?? "",
          status: asset.status,
          condition: asset.condition,
          acquiredDate: asset.acquiredDate ?? "",
          purchaseCost: asset.purchaseCost != null ? String(asset.purchaseCost) : "",
          warrantyExpiration: asset.warrantyExpiration ?? "",
          notes: asset.notes ?? "",
        }}
      />
    </div>
  );
}
