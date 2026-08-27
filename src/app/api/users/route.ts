import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { listOrganizationUsers } from "@/lib/users/users";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const results = await listOrganizationUsers(user.organizationId);
  return NextResponse.json({ users: results });
}
