import { AssetCategoriesPanel } from "@/components/admin/AssetCategoriesPanel";
import { requireAdminCapability } from "@/lib/admin/require-admin-capability";
import { ASSET_CATEGORY_CAPABILITIES } from "@/lib/assets/constants";

export default async function AdminAssetCategoriesPage() {
  await requireAdminCapability(ASSET_CATEGORY_CAPABILITIES.MANAGE);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Asset Categories</h1>
        <p className="muted">The category taxonomy used when creating and filtering assets.</p>
      </div>
      <AssetCategoriesPanel />
    </div>
  );
}
