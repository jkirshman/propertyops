import { NextResponse } from "next/server";

import { ADMIN_CAPABILITIES } from "@/lib/admin/admin-hub-config";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { listEmailSendAttempts } from "@/lib/email/history";

export async function GET(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(ADMIN_CAPABILITIES.EMAIL)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const kind = searchParams.get("kind") ?? undefined;
  const sinceParam = searchParams.get("since");
  const untilParam = searchParams.get("until");
  const limitParam = searchParams.get("limit");

  const since = sinceParam ? new Date(sinceParam) : undefined;
  const until = untilParam ? new Date(untilParam) : undefined;
  const limit = limitParam ? Number(limitParam) : undefined;

  const attempts = await listEmailSendAttempts(context.user.organizationId, {
    status,
    kind,
    since: since && !Number.isNaN(since.getTime()) ? since : undefined,
    until: until && !Number.isNaN(until.getTime()) ? until : undefined,
    limit,
  });

  return NextResponse.json({ attempts });
}
