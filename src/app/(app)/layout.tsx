import { redirect } from "next/navigation";

import { AppHeader } from "@/components/shell/AppHeader";
import { hasAnyAdminCapability } from "@/lib/admin/admin-hub-config";
import { ASSET_CAPABILITIES } from "@/lib/assets/constants";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { listAccessiblePropertyIds, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { CALENDAR_CAPABILITIES } from "@/lib/calendar/constants";
import { INSPECTION_CAPABILITIES } from "@/lib/inspections/constants";
import { resolveNavVariant } from "@/lib/navigation/nav-visibility";
import { PREVENTIVE_MAINTENANCE_CAPABILITIES } from "@/lib/preventive-maintenance/constants";
import { PROPERTY_CAPABILITIES } from "@/lib/properties/constants";
import { TENANT_CAPABILITIES } from "@/lib/tenants/constants";
import { VENDOR_CAPABILITIES } from "@/lib/vendors/constants";
import { WORK_ORDER_CAPABILITIES } from "@/lib/work-orders/constants";

export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    redirect("/login");
  }

  const { user, capabilityKeys } = context;
  const navVariant = resolveNavVariant(capabilityKeys);

  // Only needed for the User variant's "My Property" link, but resolving
  // scope is cheap (a single indexed query) and harmless for the other
  // variants, so it's simplest to always compute it here rather than branch.
  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  const accessiblePropertyIds = listAccessiblePropertyIds(scope);
  const myPropertyHref =
    accessiblePropertyIds !== null && accessiblePropertyIds.length === 1
      ? `/properties/${accessiblePropertyIds[0]}`
      : "/properties";

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%", flex: 1 }}>
      <AppHeader
        displayName={user.displayName}
        email={user.email}
        navVariant={navVariant}
        myPropertyHref={myPropertyHref}
        showAdminLink={hasAnyAdminCapability(capabilityKeys)}
        showCalendarLink={capabilityKeys.includes(CALENDAR_CAPABILITIES.VIEW)}
        showPropertiesLink={capabilityKeys.includes(PROPERTY_CAPABILITIES.VIEW)}
        showWorkOrdersLink={capabilityKeys.includes(WORK_ORDER_CAPABILITIES.VIEW)}
        showPreventiveMaintenanceLink={capabilityKeys.includes(PREVENTIVE_MAINTENANCE_CAPABILITIES.VIEW)}
        showInspectionsLink={capabilityKeys.includes(INSPECTION_CAPABILITIES.VIEW)}
        showVendorsLink={capabilityKeys.includes(VENDOR_CAPABILITIES.VIEW)}
        showTenantsLink={capabilityKeys.includes(TENANT_CAPABILITIES.VIEW)}
        showAssetsLink={capabilityKeys.includes(ASSET_CAPABILITIES.VIEW)}
      />
      <main className="container" style={{ flex: 1, width: "100%" }}>
        {children}
      </main>
    </div>
  );
}
