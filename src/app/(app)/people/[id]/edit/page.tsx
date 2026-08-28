import { notFound } from "next/navigation";

import { PersonForm } from "@/components/people/PersonForm";
import { requireCapability } from "@/lib/auth/require-capability";
import { PERSON_CAPABILITIES } from "@/lib/people/constants";
import { getPerson } from "@/lib/people/people";

export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await requireCapability(PERSON_CAPABILITIES.MANAGE, "/people");

  const person = await getPerson(context.user.organizationId, id);
  if (!person) {
    notFound();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 700 }}>
      <div>
        <h1>Edit Person</h1>
        <p className="muted">{person.displayName}</p>
      </div>
      <PersonForm
        mode="edit"
        personId={person.id}
        initialValues={{
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email ?? "",
          phone: person.phone ?? "",
          referenceNumber: person.referenceNumber ?? "",
          linkedUserId: person.linkedUserId ?? "",
        }}
      />
    </div>
  );
}
