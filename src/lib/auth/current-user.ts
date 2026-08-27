import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { getRoleCapabilityKeys } from "@/lib/auth/capabilities";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const result = await verifySessionToken(token);
  if (!result) {
    return null;
  }

  return result.user;
}

export async function getCurrentUserWithCapabilities() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const capabilityKeys = await getRoleCapabilityKeys(user.roleId);
  return { user, capabilityKeys };
}
