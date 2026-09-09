import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { PROPERTY_CAPABILITIES } from "@/lib/properties/constants";
import { PROPERTY_COMPANY_CAPABILITIES } from "@/lib/property-companies/constants";
import { createPropertyCompany, listPropertyCompanies } from "@/lib/property-companies/property-companies";
import { createPropertyCompanySchema } from "@/lib/validation/property-companies";

export async function GET(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // Reference data needed anywhere a property is viewed/filtered/created, so
  // either capability is sufficient to read the list — same pattern as
  // property types.
  const canView =
    context.capabilityKeys.includes(PROPERTY_COMPANY_CAPABILITIES.VIEW) ||
    context.capabilityKeys.includes(PROPERTY_CAPABILITIES.VIEW);
  if (!canView) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("activeOnly") === "true";

  const propertyCompanies = await listPropertyCompanies(context.user.organizationId, { activeOnly });
  return NextResponse.json({ propertyCompanies });
}

export async function POST(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(PROPERTY_COMPANY_CAPABILITIES.MANAGE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createPropertyCompanySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { user } = context;
  const propertyCompany = await createPropertyCompany(user.organizationId, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "property_company.create",
    entityType: "property_company",
    entityId: propertyCompany.id,
    after: propertyCompany,
  });

  return NextResponse.json({ propertyCompany }, { status: 201 });
}
