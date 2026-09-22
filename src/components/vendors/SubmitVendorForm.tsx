"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { VALIDATION_BANNER_MESSAGE, invalidFieldProps } from "@/lib/forms/field-errors";
import { submitVendorSchema } from "@/lib/validation/vendors";
import { describeVendorApiError, mapFieldErrors } from "@/lib/vendors/form-errors";

interface OptionRecord {
  id: string;
  name: string;
}

type FieldErrors = Partial<Record<"name" | "primaryPhone" | "primaryEmail" | "propertyId" | "notes", string>>;

/** Submits a Vendor for Manager/Admin approval instead of creating an active Vendor directly (ACCESS-1). */
export function SubmitVendorForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [notes, setNotes] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<OptionRecord[]>([]);
  const [properties, setProperties] = useState<OptionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/vendor-categories?activeOnly=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setCategories(data.categories ?? []));
    // Already Property-scoped server-side — a User only ever sees their own accessible properties here.
    fetch("/api/properties?active=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const props: OptionRecord[] = data.properties ?? [];
        setProperties(props);
        if (props.length === 1) setPropertyId(props[0].id);
      });
  }, []);

  function toggleCategory(categoryId: string) {
    setCategoryIds((prev) => (prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const payload = {
      name,
      primaryPhone: primaryPhone || undefined,
      primaryEmail: primaryEmail || undefined,
      notes: notes || undefined,
      categoryIds,
      propertyId,
    };

    const localResult = submitVendorSchema.safeParse(payload);
    if (!localResult.success) {
      setFieldErrors(mapFieldErrors(localResult.error.flatten().fieldErrors) as FieldErrors);
      setError(VALIDATION_BANNER_MESSAGE);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/vendor-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const serverFieldErrors = data?.details?.fieldErrors as Record<string, string[] | undefined> | undefined;
        if (serverFieldErrors && Object.keys(serverFieldErrors).length > 0) {
          setFieldErrors(mapFieldErrors(serverFieldErrors) as FieldErrors);
          setError(VALIDATION_BANNER_MESSAGE);
        } else {
          setError(describeVendorApiError(data?.error));
        }
        return;
      }
      setSubmitted(true);
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="card">
        <p>Thanks — your vendor request is pending review. You&apos;ll be notified once it&apos;s approved.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <h2 style={{ fontSize: "1rem" }}>Submit a vendor</h2>
      {error ? <p className="error-text">{error}</p> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.9rem" }}>
        <div>
          <label className="label" htmlFor="submit-vendor-name">
            Vendor name
          </label>
          <input
            id="submit-vendor-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            {...invalidFieldProps(Boolean(fieldErrors.name))}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="submit-vendor-property">
            Property
          </label>
          <select
            id="submit-vendor-property"
            className="input"
            value={propertyId}
            onChange={(event) => setPropertyId(event.target.value)}
            {...invalidFieldProps(Boolean(fieldErrors.propertyId))}
            required
          >
            <option value="">Select a property…</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="submit-vendor-phone">
            Phone
          </label>
          <input
            id="submit-vendor-phone"
            className="input"
            value={primaryPhone}
            onChange={(event) => setPrimaryPhone(event.target.value)}
            {...invalidFieldProps(Boolean(fieldErrors.primaryPhone))}
          />
        </div>
        <div>
          <label className="label" htmlFor="submit-vendor-email">
            Email
          </label>
          <input
            id="submit-vendor-email"
            type="email"
            className="input"
            value={primaryEmail}
            onChange={(event) => setPrimaryEmail(event.target.value)}
            {...invalidFieldProps(Boolean(fieldErrors.primaryEmail))}
          />
        </div>
      </div>

      {categories.length > 0 ? (
        <div>
          <span className="label">Services</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {categories.map((category) => (
              <label key={category.id} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <input
                  type="checkbox"
                  checked={categoryIds.includes(category.id)}
                  onChange={() => toggleCategory(category.id)}
                />
                {category.name}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <label className="label" htmlFor="submit-vendor-notes">
          Notes / reason
        </label>
        <textarea
          id="submit-vendor-notes"
          className="input"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          {...invalidFieldProps(Boolean(fieldErrors.notes))}
        />
      </div>

      <div>
        <button type="submit" className="button button-primary" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit for approval"}
        </button>
      </div>
    </form>
  );
}
