import { AssetForm } from "@/components/assets/AssetForm";
import { listAssetCategories } from "@/lib/assets/categories";
import { ASSET_CAPABILITIES } from "@/lib/assets/constants";
import { requireCapability } from "@/lib/auth/require-capability";

export default async function NewAssetPage() {
  const context = await requireCapability(ASSET_CAPABILITIES.CREATE, "/assets");
  const categories = await listAssetCategories(context.user.organizationId, { activeOnly: true });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 800 }}>
      <div>
        <h1>New Asset</h1>
        <p className="muted">Add an organization-owned tracked item.</p>
      </div>
      <AssetForm mode="create" categories={categories} />
    </div>
  );
}
