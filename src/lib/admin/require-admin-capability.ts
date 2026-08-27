import { redirect } from "next/navigation";

import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";

export async function requireAdminCapability(capability: string) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    redirect("/login");
  }

  if (!context.capabilityKeys.includes(capability)) {
    redirect("/admin");
  }

  return context;
}
