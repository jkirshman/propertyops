import { redirect } from "next/navigation";

import { AppHeader } from "@/components/shell/AppHeader";
import { hasAnyAdminCapability } from "@/lib/admin/admin-hub-config";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { PROPERTY_CAPABILITIES } from "@/lib/properties/constants";

export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    redirect("/login");
  }

  const { user, capabilityKeys } = context;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%", flex: 1 }}>
      <AppHeader
        displayName={user.displayName}
        email={user.email}
        showAdminLink={hasAnyAdminCapability(capabilityKeys)}
        showPropertiesLink={capabilityKeys.includes(PROPERTY_CAPABILITIES.VIEW)}
      />
      <main className="container" style={{ flex: 1, width: "100%" }}>
        {children}
      </main>
    </div>
  );
}
