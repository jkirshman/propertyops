"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

interface UserOption {
  id: string;
  displayName: string;
  email: string;
}

export interface PersonFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  referenceNumber: string;
  linkedUserId: string;
}

const EMPTY_VALUES: PersonFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  referenceNumber: "",
  linkedUserId: "",
};

function toPayload(values: PersonFormValues) {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email || undefined,
    phone: values.phone || undefined,
    referenceNumber: values.referenceNumber || undefined,
    linkedUserId: values.linkedUserId || undefined,
  };
}

export function PersonForm({
  mode,
  personId,
  initialValues,
}: {
  mode: "create" | "edit";
  personId?: string;
  initialValues?: Partial<PersonFormValues>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<PersonFormValues>({ ...EMPTY_VALUES, ...initialValues });
  const [users, setUsers] = useState<UserOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/users")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setUsers(data.users ?? []);
      });
  }, []);

  function update<K extends keyof PersonFormValues>(key: K, value: PersonFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!values.firstName.trim() || !values.lastName.trim()) {
      setError("Enter a first and last name.");
      return;
    }

    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/people" : `/api/people/${personId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(values)),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.message ?? "Could not save the person. Check the fields and try again.");
        return;
      }

      const person = data.person;
      router.push(`/people/${person.id}`);
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error ? <p className="error-text">{error}</p> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.9rem" }}>
        <div>
          <label className="label" htmlFor="firstName">
            First name
          </label>
          <input
            id="firstName"
            className="input"
            value={values.firstName}
            onChange={(event) => update("firstName", event.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="lastName">
            Last name
          </label>
          <input
            id="lastName"
            className="input"
            value={values.lastName}
            onChange={(event) => update("lastName", event.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email (optional)
          </label>
          <input
            id="email"
            type="email"
            className="input"
            value={values.email}
            onChange={(event) => update("email", event.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Phone (optional)
          </label>
          <input
            id="phone"
            className="input"
            value={values.phone}
            onChange={(event) => update("phone", event.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="referenceNumber">
            Reference / employee number (optional)
          </label>
          <input
            id="referenceNumber"
            className="input"
            value={values.referenceNumber}
            onChange={(event) => update("referenceNumber", event.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="linkedUserId">
            Linked system user (optional)
          </label>
          <select
            id="linkedUserId"
            className="input"
            value={values.linkedUserId}
            onChange={(event) => update("linkedUserId", event.target.value)}
          >
            <option value="">Not linked</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName} ({user.email})
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="button button-primary"
        disabled={submitting}
        style={{ alignSelf: "flex-start" }}
      >
        {submitting ? "Saving…" : mode === "create" ? "Create person" : "Save changes"}
      </button>
    </form>
  );
}
