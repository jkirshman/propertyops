import Link from "next/link";
import { notFound } from "next/navigation";

import { PersonDetailPanel } from "@/components/people/PersonDetailPanel";
import { ASSET_CAPABILITIES } from "@/lib/assets/constants";
import { requireCapability } from "@/lib/auth/require-capability";
import { PERSON_CAPABILITIES } from "@/lib/people/constants";
import { getPerson } from "@/lib/people/people";

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await requireCapability(PERSON_CAPABILITIES.VIEW, "/people");

  const person = await getPerson(context.user.organizationId, id);
  if (!person) {
    notFound();
  }

  const { capabilityKeys } = context;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ marginBottom: "0.3rem" }}>{person.displayName}</h1>
          <div className="muted" style={{ fontSize: "0.9rem" }}>
            {!person.isActive ? "Inactive" : "Active"}
          </div>
        </div>
        {capabilityKeys.includes(PERSON_CAPABILITIES.MANAGE) ? (
          <Link href={`/people/${person.id}/edit`} className="button">
            Edit
          </Link>
        ) : null}
      </div>

      <PersonDetailPanel
        person={person}
        canOnboard={
          capabilityKeys.includes(ASSET_CAPABILITIES.ONBOARDING) &&
          capabilityKeys.includes(ASSET_CAPABILITIES.ASSIGN)
        }
        canOffboard={
          capabilityKeys.includes(ASSET_CAPABILITIES.OFFBOARDING) &&
          capabilityKeys.includes(ASSET_CAPABILITIES.ASSIGN)
        }
      />
    </div>
  );
}
