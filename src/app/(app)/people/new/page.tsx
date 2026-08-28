import { PersonForm } from "@/components/people/PersonForm";
import { requireCapability } from "@/lib/auth/require-capability";
import { PERSON_CAPABILITIES } from "@/lib/people/constants";

export default async function NewPersonPage() {
  await requireCapability(PERSON_CAPABILITIES.MANAGE, "/people");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 700 }}>
      <div>
        <h1>New Person</h1>
        <p className="muted">Add a person who can be assigned organization assets.</p>
      </div>
      <PersonForm mode="create" />
    </div>
  );
}
