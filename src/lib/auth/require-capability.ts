import { redirect } from "next/navigation";

import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";

export async function requireCapability(capability: string, fallbackHref = "/") {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    redirect("/login");
  }

  if (!context.capabilityKeys.includes(capability)) {
    redirect(fallbackHref);
  }

  return context;
}
