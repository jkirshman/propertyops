"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { OCCUPANCY_MODEL_LABELS, OCCUPANCY_MODELS } from "@/lib/properties/constants";

interface PropertyTypeOption {
  id: string;
  name: string;
}

export interface PropertyFormValues {
  propertyTypeId: string;
  name: string;
  propertyCode: string;
  occupancyModel: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  squareFootage: string;
  yearBuilt: string;
  parcelId: string;
  description: string;
  operationalNotes: string;
  primaryPhone: string;
  primaryEmail: string;
}

const EMPTY_VALUES: PropertyFormValues = {
  propertyTypeId: "",
  name: "",
  propertyCode: "",
  occupancyModel: "other",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  squareFootage: "",
  yearBuilt: "",
  parcelId: "",
  description: "",
  operationalNotes: "",
  primaryPhone: "",
  primaryEmail: "",
};

function toPayload(values: PropertyFormValues) {
  return {
    propertyTypeId: values.propertyTypeId,
    name: values.name,
    propertyCode: values.propertyCode,
    occupancyModel: values.occupancyModel,
    addressLine1: values.addressLine1,
    addressLine2: values.addressLine2,
    city: values.city,
    state: values.state,
    postalCode: values.postalCode,
    country: values.country,
    squareFootage: values.squareFootage ? Number(values.squareFootage) : undefined,
    yearBuilt: values.yearBuilt ? Number(values.yearBuilt) : undefined,
    parcelId: values.parcelId,
    description: values.description,
    operationalNotes: values.operationalNotes,
    primaryPhone: values.primaryPhone,
    primaryEmail: values.primaryEmail,
  };
}

export function PropertyForm({
  mode,
  propertyId,
  propertyTypes,
  initialValues,
}: {
  mode: "create" | "edit";
  propertyId?: string;
  propertyTypes: PropertyTypeOption[];
  initialValues?: Partial<PropertyFormValues>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<PropertyFormValues>({ ...EMPTY_VALUES, ...initialValues });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof PropertyFormValues>(key: K, value: PropertyFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!values.propertyTypeId) {
      setError("Select a property type.");
      return;
    }
    if (!values.name.trim()) {
      setError("Enter a property name.");
      return;
    }

    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/properties" : `/api/properties/${propertyId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(values)),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.message ?? "Could not save the property. Check the fields and try again.");
        return;
      }

      const property = data.property;
      router.push(`/properties/${property.id}`);
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
            <label className="label" htmlFor="name">
              Property name
            </label>
            <input
              id="name"
              className="input"
              value={values.name}
              onChange={(event) => update("name", event.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="propertyTypeId">
              Property type
            </label>
            <select
              id="propertyTypeId"
              className="input"
              value={values.propertyTypeId}
              onChange={(event) => update("propertyTypeId", event.target.value)}
              required
            >
              <option value="">Select a type…</option>
              {propertyTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="propertyCode">
              Property code (optional)
            </label>
            <input
              id="propertyCode"
              className="input"
              value={values.propertyCode}
              onChange={(event) => update("propertyCode", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="occupancyModel">
              Occupancy model
            </label>
            <select
              id="occupancyModel"
              className="input"
              value={values.occupancyModel}
              onChange={(event) => update("occupancyModel", event.target.value)}
            >
              {OCCUPANCY_MODELS.map((model) => (
                <option key={model} value={model}>
                  {OCCUPANCY_MODEL_LABELS[model]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Address</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.9rem" }}>
          <div>
            <label className="label" htmlFor="addressLine1">
              Address line 1
            </label>
            <input
              id="addressLine1"
              className="input"
              value={values.addressLine1}
              onChange={(event) => update("addressLine1", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="addressLine2">
              Address line 2
            </label>
            <input
              id="addressLine2"
              className="input"
              value={values.addressLine2}
              onChange={(event) => update("addressLine2", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="city">
              City
            </label>
            <input id="city" className="input" value={values.city} onChange={(event) => update("city", event.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="state">
              State / Province
            </label>
            <input
              id="state"
              className="input"
              value={values.state}
              onChange={(event) => update("state", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="postalCode">
              Postal code
            </label>
            <input
              id="postalCode"
              className="input"
              value={values.postalCode}
              onChange={(event) => update("postalCode", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="country">
              Country
            </label>
            <input
              id="country"
              className="input"
              value={values.country}
              onChange={(event) => update("country", event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Site details</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.9rem" }}>
          <div>
            <label className="label" htmlFor="squareFootage">
              Square footage
            </label>
            <input
              id="squareFootage"
              type="number"
              min={0}
              className="input"
              value={values.squareFootage}
              onChange={(event) => update("squareFootage", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="yearBuilt">
              Year built
            </label>
            <input
              id="yearBuilt"
              type="number"
              min={1600}
              max={2100}
              className="input"
              value={values.yearBuilt}
              onChange={(event) => update("yearBuilt", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="parcelId">
              Parcel / property identifier
            </label>
            <input
              id="parcelId"
              className="input"
              value={values.parcelId}
              onChange={(event) => update("parcelId", event.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            className="input"
            rows={3}
            value={values.description}
            onChange={(event) => update("description", event.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="operationalNotes">
            Operational notes
          </label>
          <textarea
            id="operationalNotes"
            className="input"
            rows={3}
            value={values.operationalNotes}
            onChange={(event) => update("operationalNotes", event.target.value)}
          />
        </div>
      </section>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Contact</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.9rem" }}>
          <div>
            <label className="label" htmlFor="primaryPhone">
              Primary phone
            </label>
            <input
              id="primaryPhone"
              className="input"
              value={values.primaryPhone}
              onChange={(event) => update("primaryPhone", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="primaryEmail">
              Primary email
            </label>
            <input
              id="primaryEmail"
              type="email"
              className="input"
              value={values.primaryEmail}
              onChange={(event) => update("primaryEmail", event.target.value)}
            />
          </div>
        </div>
      </section>

      <button
        type="submit"
        className="button button-primary"
        disabled={submitting}
        style={{ alignSelf: "flex-start" }}
      >
        {submitting ? "Saving…" : mode === "create" ? "Create property" : "Save changes"}
      </button>
    </form>
  );
}
