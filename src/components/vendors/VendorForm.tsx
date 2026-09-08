"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { VENDOR_COVERAGE_MODES, VENDOR_COVERAGE_MODE_LABELS } from "@/lib/vendors/constants";

interface CategoryOption {
  id: string;
  name: string;
}

export interface VendorFormValues {
  name: string;
  legalName: string;
  isPreferred: boolean;
  primaryPhone: string;
  primaryEmail: string;
  website: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  accountNumber: string;
  notes: string;
  coverageMode: string;
  insuranceExpiresAt: string;
  licenseExpiresAt: string;
  contractExpiresAt: string;
  categoryIds: string[];
}

const EMPTY_VALUES: VendorFormValues = {
  name: "",
  legalName: "",
  isPreferred: false,
  primaryPhone: "",
  primaryEmail: "",
  website: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  accountNumber: "",
  notes: "",
  coverageMode: "all",
  insuranceExpiresAt: "",
  licenseExpiresAt: "",
  contractExpiresAt: "",
  categoryIds: [],
};

function toPayload(values: VendorFormValues) {
  return {
    name: values.name,
    legalName: values.legalName || undefined,
    isPreferred: values.isPreferred,
    primaryPhone: values.primaryPhone || undefined,
    primaryEmail: values.primaryEmail || undefined,
    website: values.website || undefined,
    addressLine1: values.addressLine1 || undefined,
    addressLine2: values.addressLine2 || undefined,
    city: values.city || undefined,
    state: values.state || undefined,
    postalCode: values.postalCode || undefined,
    country: values.country || undefined,
    accountNumber: values.accountNumber || undefined,
    notes: values.notes || undefined,
    coverageMode: values.coverageMode,
    insuranceExpiresAt: values.insuranceExpiresAt || null,
    licenseExpiresAt: values.licenseExpiresAt || null,
    contractExpiresAt: values.contractExpiresAt || null,
    categoryIds: values.categoryIds,
  };
}

export function VendorForm({
  mode,
  vendorId,
  initialValues,
}: {
  mode: "create" | "edit";
  vendorId?: string;
  initialValues?: Partial<VendorFormValues>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<VendorFormValues>({ ...EMPTY_VALUES, ...initialValues });
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/vendor-categories?activeOnly=true")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setCategories(data.categories ?? []));
  }, []);

  function update<K extends keyof VendorFormValues>(key: K, value: VendorFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleCategory(categoryId: string) {
    setValues((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter((id) => id !== categoryId)
        : [...prev.categoryIds, categoryId],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!values.name.trim()) {
      setError("Enter a vendor name.");
      return;
    }

    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/vendors" : `/api/vendors/${vendorId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(values)),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Could not save the vendor. Check the fields and try again.");
        return;
      }
      const vendor = data.vendor;
      router.push(`/vendors/${vendor.id}`);
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
            <label className="label" htmlFor="vendor-name">
              Vendor name
            </label>
            <input
              id="vendor-name"
              className="input"
              value={values.name}
              onChange={(event) => update("name", event.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="vendor-legal-name">
              Legal / business name (optional)
            </label>
            <input
              id="vendor-legal-name"
              className="input"
              value={values.legalName}
              onChange={(event) => update("legalName", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="vendor-phone">
              Primary phone
            </label>
            <input
              id="vendor-phone"
              className="input"
              value={values.primaryPhone}
              onChange={(event) => update("primaryPhone", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="vendor-email">
              Primary email
            </label>
            <input
              id="vendor-email"
              type="email"
              className="input"
              value={values.primaryEmail}
              onChange={(event) => update("primaryEmail", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="vendor-website">
              Website (optional)
            </label>
            <input
              id="vendor-website"
              className="input"
              value={values.website}
              onChange={(event) => update("website", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="vendor-account-number">
              Account / reference number (optional)
            </label>
            <input
              id="vendor-account-number"
              className="input"
              value={values.accountNumber}
              onChange={(event) => update("accountNumber", event.target.value)}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "0.4rem" }}>
            <input
              id="vendor-preferred"
              type="checkbox"
              checked={values.isPreferred}
              onChange={(event) => update("isPreferred", event.target.checked)}
            />
            <label htmlFor="vendor-preferred">Preferred vendor</label>
          </div>
        </div>
      </section>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Address</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.9rem" }}>
          <div>
            <label className="label" htmlFor="vendor-address1">
              Address line 1
            </label>
            <input
              id="vendor-address1"
              className="input"
              value={values.addressLine1}
              onChange={(event) => update("addressLine1", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="vendor-address2">
              Address line 2
            </label>
            <input
              id="vendor-address2"
              className="input"
              value={values.addressLine2}
              onChange={(event) => update("addressLine2", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="vendor-city">
              City
            </label>
            <input id="vendor-city" className="input" value={values.city} onChange={(event) => update("city", event.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="vendor-state">
              State / Province
            </label>
            <input
              id="vendor-state"
              className="input"
              value={values.state}
              onChange={(event) => update("state", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="vendor-postal-code">
              Postal code
            </label>
            <input
              id="vendor-postal-code"
              className="input"
              value={values.postalCode}
              onChange={(event) => update("postalCode", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="vendor-country">
              Country
            </label>
            <input
              id="vendor-country"
              className="input"
              value={values.country}
              onChange={(event) => update("country", event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Services & coverage</h2>
        <div>
          <div className="label">Service categories</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            {categories.length === 0 ? (
              <span className="muted" style={{ fontSize: "0.85rem" }}>No vendor categories configured yet.</span>
            ) : (
              categories.map((category) => (
                <label key={category.id} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.9rem" }}>
                  <input
                    type="checkbox"
                    checked={values.categoryIds.includes(category.id)}
                    onChange={() => toggleCategory(category.id)}
                  />
                  {category.name}
                </label>
              ))
            )}
          </div>
        </div>
        <div style={{ maxWidth: 320 }}>
          <label className="label" htmlFor="vendor-coverage-mode">
            Property coverage
          </label>
          <select
            id="vendor-coverage-mode"
            className="input"
            value={values.coverageMode}
            onChange={(event) => update("coverageMode", event.target.value)}
          >
            {VENDOR_COVERAGE_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {VENDOR_COVERAGE_MODE_LABELS[mode]}
              </option>
            ))}
          </select>
          {values.coverageMode === "specific" ? (
            <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.35rem" }}>
              Specific properties are managed from the vendor detail page after saving.
            </p>
          ) : null}
        </div>
      </section>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Compliance (optional)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.9rem" }}>
          <div>
            <label className="label" htmlFor="vendor-insurance-expires">
              Insurance expiration
            </label>
            <input
              id="vendor-insurance-expires"
              type="date"
              className="input"
              value={values.insuranceExpiresAt}
              onChange={(event) => update("insuranceExpiresAt", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="vendor-license-expires">
              License expiration
            </label>
            <input
              id="vendor-license-expires"
              type="date"
              className="input"
              value={values.licenseExpiresAt}
              onChange={(event) => update("licenseExpiresAt", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="vendor-contract-expires">
              Contract expiration
            </label>
            <input
              id="vendor-contract-expires"
              type="date"
              className="input"
              value={values.contractExpiresAt}
              onChange={(event) => update("contractExpiresAt", event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Notes</h2>
        <textarea
          className="input"
          rows={3}
          value={values.notes}
          onChange={(event) => update("notes", event.target.value)}
        />
      </section>

      <button
        type="submit"
        className="button button-primary"
        disabled={submitting}
        style={{ alignSelf: "flex-start" }}
      >
        {submitting ? "Saving…" : mode === "create" ? "Create vendor" : "Save changes"}
      </button>
    </form>
  );
}
