"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  ASSET_CONDITIONS,
  ASSET_CONDITION_LABELS,
  ASSET_STATUSES,
  ASSET_STATUS_LABELS,
} from "@/lib/assets/constants";

interface CategoryOption {
  id: string;
  name: string;
}

export interface AssetFormValues {
  categoryId: string;
  displayName: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  status: string;
  condition: string;
  acquiredDate: string;
  purchaseCost: string;
  warrantyExpiration: string;
  notes: string;
}

const EMPTY_VALUES: AssetFormValues = {
  categoryId: "",
  displayName: "",
  manufacturer: "",
  model: "",
  serialNumber: "",
  status: "available",
  condition: "unknown",
  acquiredDate: "",
  purchaseCost: "",
  warrantyExpiration: "",
  notes: "",
};

function toPayload(values: AssetFormValues) {
  return {
    categoryId: values.categoryId,
    displayName: values.displayName,
    manufacturer: values.manufacturer || undefined,
    model: values.model || undefined,
    serialNumber: values.serialNumber || undefined,
    status: values.status,
    condition: values.condition,
    acquiredDate: values.acquiredDate || undefined,
    purchaseCost: values.purchaseCost ? Number(values.purchaseCost) : undefined,
    warrantyExpiration: values.warrantyExpiration || undefined,
    notes: values.notes || undefined,
  };
}

export function AssetForm({
  mode,
  assetId,
  categories,
  initialValues,
}: {
  mode: "create" | "edit";
  assetId?: string;
  categories: CategoryOption[];
  initialValues?: Partial<AssetFormValues>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<AssetFormValues>({ ...EMPTY_VALUES, ...initialValues });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof AssetFormValues>(key: K, value: AssetFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!values.categoryId) {
      setError("Select a category.");
      return;
    }
    if (!values.displayName.trim()) {
      setError("Enter a display name.");
      return;
    }

    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/assets" : `/api/assets/${assetId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(values)),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.message ?? "Could not save the asset. Check the fields and try again.");
        return;
      }

      const asset = data.asset;
      router.push(`/assets/${asset.id}`);
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
            <label className="label" htmlFor="displayName">
              Display name
            </label>
            <input
              id="displayName"
              className="input"
              value={values.displayName}
              onChange={(event) => update("displayName", event.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="categoryId">
              Category
            </label>
            <select
              id="categoryId"
              className="input"
              value={values.categoryId}
              onChange={(event) => update("categoryId", event.target.value)}
              required
            >
              <option value="">Select a category…</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="manufacturer">
              Manufacturer
            </label>
            <input
              id="manufacturer"
              className="input"
              value={values.manufacturer}
              onChange={(event) => update("manufacturer", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="model">
              Model
            </label>
            <input
              id="model"
              className="input"
              value={values.model}
              onChange={(event) => update("model", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="serialNumber">
              Serial number
            </label>
            <input
              id="serialNumber"
              className="input"
              value={values.serialNumber}
              onChange={(event) => update("serialNumber", event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Operational state</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.9rem" }}>
          <div>
            <label className="label" htmlFor="status">
              Status
            </label>
            <select id="status" className="input" value={values.status} onChange={(event) => update("status", event.target.value)}>
              {ASSET_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {ASSET_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="condition">
              Condition
            </label>
            <select
              id="condition"
              className="input"
              value={values.condition}
              onChange={(event) => update("condition", event.target.value)}
            >
              {ASSET_CONDITIONS.map((value) => (
                <option key={value} value={value}>
                  {ASSET_CONDITION_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Lifecycle</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.9rem" }}>
          <div>
            <label className="label" htmlFor="acquiredDate">
              Acquired date
            </label>
            <input
              id="acquiredDate"
              type="date"
              className="input"
              value={values.acquiredDate}
              onChange={(event) => update("acquiredDate", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="purchaseCost">
              Purchase cost (optional)
            </label>
            <input
              id="purchaseCost"
              type="number"
              min={0}
              step="0.01"
              className="input"
              value={values.purchaseCost}
              onChange={(event) => update("purchaseCost", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="warrantyExpiration">
              Warranty expiration (optional)
            </label>
            <input
              id="warrantyExpiration"
              type="date"
              className="input"
              value={values.warrantyExpiration}
              onChange={(event) => update("warrantyExpiration", event.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            className="input"
            rows={3}
            value={values.notes}
            onChange={(event) => update("notes", event.target.value)}
          />
        </div>
      </section>

      <button
        type="submit"
        className="button button-primary"
        disabled={submitting}
        style={{ alignSelf: "flex-start" }}
      >
        {submitting ? "Saving…" : mode === "create" ? "Create asset" : "Save changes"}
      </button>
    </form>
  );
}
