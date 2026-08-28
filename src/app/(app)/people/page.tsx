import { PeopleListPanel } from "@/components/people/PeopleListPanel";
import { requireCapability } from "@/lib/auth/require-capability";
import { PERSON_CAPABILITIES } from "@/lib/people/constants";

export default async function PeoplePage() {
  const context = await requireCapability(PERSON_CAPABILITIES.VIEW, "/");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>People</h1>
        <p className="muted">People who can be assigned organization assets.</p>
      </div>
      <PeopleListPanel canCreate={context.capabilityKeys.includes(PERSON_CAPABILITIES.MANAGE)} />
    </div>
  );
}
