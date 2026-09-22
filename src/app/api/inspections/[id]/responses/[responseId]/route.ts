import { NextResponse } from "next/server";

import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { resolveUserPropertyScope } from "@/lib/auth/property-access";
import { INSPECTION_CAPABILITIES } from "@/lib/inspections/constants";
import { startInspectionIfDraft } from "@/lib/inspections/inspections";
import { getAccessibleInspection } from "@/lib/inspections/inspection-access";
import { getInspectionResponse, updateInspectionResponse } from "@/lib/inspections/responses";
import { updateInspectionResponseSchema } from "@/lib/validation/inspections";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; responseId: string }> },
) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(INSPECTION_CAPABILITIES.EDIT)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id, responseId } = await params;
  const { user, capabilityKeys } = context;

  // UNIT-OPS-1: another Unit's Inspection is a 404, same as another Property's.
  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  const inspection = await getAccessibleInspection(user.organizationId, scope, id);
  if (!inspection) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (inspection.status === "completed" || inspection.status === "cancelled") {
    return NextResponse.json({ error: "inspection_finalized" }, { status: 409 });
  }

  const existing = await getInspectionResponse(user.organizationId, id, responseId);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateInspectionResponseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await updateInspectionResponse(user.organizationId, id, responseId, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // First saved response on a scheduled-but-not-yet-started inspection moves
  // it to in_progress — no separate "Start Inspection" click needed.
  await startInspectionIfDraft(user.organizationId, id);

  return NextResponse.json({ response: updated });
}
