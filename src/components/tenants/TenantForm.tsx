"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { VALIDATION_BANNER_MESSAGE, describeApiError, invalidFieldProps, mapFieldErrors } from "@/lib/forms/field-errors";
import { TENANT_TYPES, TENANT_TYPE_LABELS, type TenantType } from "@/lib/tenants/constants";
import { createTenantSchema, updateTenantSchema } from "@/lib/validation/tenants";

export interface TenantFormValues {
  tenantType: TenantType;
  name: string;
  legalName: string;
  primaryPhone: string;
  primaryEmail: string;
  website: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  notes: string;
}

const EMPTY_VALUES: TenantFormValues = {
  tenantType: "individual",
  name: "",
  legalName: "",
  primaryPhone: "",
  primaryEmail: "",
  website: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  notes: "",
};

function toPayload(values: TenantFormValues) {
  return {
    tenantType: values.tenantType,
    name: values.name,
    legalName: values.legalName || undefined,
    primaryPhone: values.primaryPhone || undefined,
    primaryEmail: values.primaryEmail || undefined,
    website: values.website || undefined,
    addressLine1: values.addressLine1 || undefined,
    addressLine2: values.addressLine2 || undefined,
    city: values.city || undefined,
    state: values.state || undefined,
    postalCode: values.postalCode || undefined,
    country: values.country || undefined,
    notes: values.notes || undefined,
  };
}

export function TenantForm({
  mode,
  tenantId,
  initialValues,
}: {
  mode: "create" | "edit";
  tenantId?: string;
  initialValues?: Partial<TenantFormValues>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<TenantFormValues>({ ...EMPTY_VALUES, ...initialValues });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof TenantFormValues>(key: K, value: TenantFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const payload = toPayload(values);
    const schema = mode === "create" ? createTenantSchema : updateTenantSchema;
    const localResult = schema.safeParse(payload);
    if (!localResult.success) {
      setFieldErrors(mapFieldErrors(localResult.error.flatten().fieldErrors));
      setError(VALIDATION_BANNER_MESSAGE);
      return;
    }

    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/tenants" : `/api/tenants/${tenantId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const serverFieldErrors = data?.details?.fieldErrors as Record<string, string[] | undefined> | undefined;
        if (serverFieldErrors && Object.keys(serverFieldErrors).length > 0) {
          setFieldErrors(mapFieldErrors(serverFieldErrors));
          setError(VALIDATION_BANNER_MESSAGE);
        } else {
          setError(describeApiError(data?.error));
        }
        return;
      }
      router.push(`/tenants/${data.tenant.id}`);
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error ? <p className="error-text">{error}</p> : null}

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Identity</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.9rem" }}>
          <div>
            <label className="label" htmlFor="tenant-type">Tenant type</label>
            <select
              id="tenant-type"
              className="input"
              value={values.tenantType}
              onChange={(event) => update("tenantType", event.target.value as TenantType)}
            >
              {TENANT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TENANT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="tenant-name">Tenant / business name</label>
            <input
              id="tenant-name"
              className="input"
              value={values.name}
              onChange={(event) => update("name", event.target.value)}
              {...invalidFieldProps(Boolean(fieldErrors.name))}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="tenant-legal-name">Legal name (optional)</label>
            <input
              id="tenant-legal-name"
              className="input"
              value={values.legalName}
              onChange={(event) => update("legalName", event.target.value)}
              {...invalidFieldProps(Boolean(fieldErrors.legalName))}
            />
          </div>
          <div>
            <label className="label" htmlFor="tenant-phone">Primary phone</label>
            <input
              id="tenant-phone"
              className="input"
              value={values.primaryPhone}
              onChange={(event) => update("primaryPhone", event.target.value)}
              {...invalidFieldProps(Boolean(fieldErrors.primaryPhone))}
            />
          </div>
          <div>
            <label className="label" htmlFor="tenant-email">Primary email</label>
            <input
              id="tenant-email"
              type="email"
              className="input"
              value={values.primaryEmail}
              onChange={(event) => update("primaryEmail", event.target.value)}
              {...invalidFieldProps(Boolean(fieldErrors.primaryEmail), "tenant-email-error")}
            />
            {fieldErrors.primaryEmail ? (
              <p id="tenant-email-error" className="error-text" style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
                {fieldErrors.primaryEmail}
              </p>
            ) : null}
          </div>
          <div>
            <label className="label" htmlFor="tenant-website">Website (optional)</label>
            <input
              id="tenant-website"
              className="input"
              value={values.website}
              onChange={(event) => update("website", event.target.value)}
              {...invalidFieldProps(Boolean(fieldErrors.website))}
            />
          </div>
        </div>
      </section>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Billing / mailing address (optional)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.9rem" }}>
          <div>
            <label className="label" htmlFor="tenant-address1">Address line 1</label>
            <input
              id="tenant-address1"
              className="input"
              value={values.addressLine1}
              onChange={(event) => update("addressLine1", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="tenant-address2">Address line 2</label>
            <input
              id="tenant-address2"
              className="input"
              value={values.addressLine2}
              onChange={(event) => update("addressLine2", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="tenant-city">City</label>
            <input
              id="tenant-city"
              className="input"
              value={values.city}
              onChange={(event) => update("city", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="tenant-state">State / Province</label>
            <input
              id="tenant-state"
              className="input"
              value={values.state}
              onChange={(event) => update("state", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="tenant-postal-code">Postal code</label>
            <input
              id="tenant-postal-code"
              className="input"
              value={values.postalCode}
              onChange={(event) => update("postalCode", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="tenant-country">Country</label>
            <input
              id="tenant-country"
              className="input"
              value={values.country}
              onChange={(event) => update("country", event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Notes (optional)</h2>
        <textarea
          className="input"
          rows={3}
          value={values.notes}
          onChange={(event) => update("notes", event.target.value)}
        />
      </section>

      <button type="submit" className="button button-primary" disabled={submitting} style={{ alignSelf: "flex-start" }}>
        {submitting ? "Saving…" : mode === "create" ? "Create tenant" : "Save changes"}
      </button>
    </form>
  );
}
