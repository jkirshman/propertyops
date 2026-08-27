import { requireCapability } from "@/lib/auth/require-capability";

export async function requireAdminCapability(capability: string) {
  return requireCapability(capability, "/admin");
}
