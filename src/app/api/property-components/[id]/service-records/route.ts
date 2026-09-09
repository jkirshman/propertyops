import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { PROPERTY_COMPONENT_CAPABILITIES } from "@/lib/property-components/constants";
import { getPropertyComponent } from "@/lib/property-components/property-components";
import {
  createPropertyComponentServiceRecord,
  listPropertyComponentServiceRecords,
} from "@/lib/property-components/service-records";
import { createPropertyComponentServiceRecordSchema } from "@/lib/validation/property-component-service-records";
import { getVendor } from "@/lib/vendors/vendors";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(PROPERTY_COMPONENT_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const records = await listPropertyComponentServiceRecords(context.user.organizationId, id);
  return NextResponse.json({ serviceRecords: records });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(PROPERTY_COMPONENT_CAPABILITIES.MANAGE_SERVICE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user } = context;

  const component = await getPropertyComponent(user.organizationId, id);
  if (!component) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createPropertyComponentServiceRecordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.vendorId) {
    const vendor = await getVendor(user.organizationId, parsed.data.vendorId);
    if (!vendor) {
      return NextResponse.json({ error: "invalid_vendor" }, { status: 400 });
    }
  }

  const record = await createPropertyComponentServiceRecord(user.organizationId, id, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "property_component.service_record_create",
    entityType: "property_component",
    entityId: id,
    after: { serviceRecordId: record.id, serviceDate: record.serviceDate },
  });

  return NextResponse.json({ serviceRecord: record }, { status: 201 });
}
