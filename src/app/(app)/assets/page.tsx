import { AssetsListPanel } from "@/components/assets/AssetsListPanel";
import { ASSET_CAPABILITIES } from "@/lib/assets/constants";
import { requireCapability } from "@/lib/auth/require-capability";

export default async function AssetsPage() {
  const context = await requireCapability(ASSET_CAPABILITIES.VIEW, "/");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Assets</h1>
        <p className="muted">Organization-owned tracked items — where they are and who has them.</p>
      </div>
      <AssetsListPanel canCreate={context.capabilityKeys.includes(ASSET_CAPABILITIES.CREATE)} />
    </div>
  );
}
