"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { VALIDATION_BANNER_MESSAGE, describeApiError, invalidFieldProps, mapFieldErrors } from "@/lib/forms/field-errors";
import {
  LEASE_STATUSES,
  LEASE_STATUS_LABELS,
  LEASE_TYPES,
  LEASE_TYPE_LABELS,
  RENT_FREQUENCIES,
  RENT_FREQUENCY_LABELS,
  type LeaseStatus,
  type LeaseType,
  type RentFrequency,
} from "@/lib/leases/constants";
import { createLeaseSchema, updateLeaseSchema } from "@/lib/validation/leases";

interface OptionRecord {
  id: string;
  name: string;
}

export interface LeaseFormValues {
  propertyId: string;
  tenantId: string;
  label: string;
  leaseType: LeaseType;
  status: LeaseStatus;
  startDate: string;
  endDate: string;
  noticeDate: string;
  renewalOptionDate: string;
  moveInDate: string;
  moveOutDate: string;
  securityDeposit: string;
  baseRent: string;
  rentFrequency: RentFrequency | "";
  squareFootageLeased: string;
  unitLabel: string;
  propertyUnitId: string;
  notes: string;
}

interface UnitOption {
  id: string;
  unitLabel: string;
  isActive: boolean;
}

const EMPTY_VALUES: LeaseFormValues = {
  propertyId: "",
  tenantId: "",
  label: "",
  leaseType: "residential",
  status: "draft",
  startDate: "",
  endDate: "",
  noticeDate: "",
  renewalOptionDate: "",
  moveInDate: "",
  moveOutDate: "",
  securityDeposit: "",
  baseRent: "",
  rentFrequency: "",
  squareFootageLeased: "",
  unitLabel: "",
  propertyUnitId: "",
  notes: "",
};

function toPayload(values: LeaseFormValues, mode: "create" | "edit") {
  return {
    propertyId: values.propertyId,
    tenantId: values.tenantId,
    label: values.label,
    leaseType: values.leaseType,
    status: values.status,
    startDate: values.startDate,
    endDate: values.endDate || undefined,
    noticeDate: values.noticeDate || undefined,
    renewalOptionDate: values.renewalOptionDate || undefined,
    moveInDate: values.moveInDate || undefined,
    moveOutDate: values.moveOutDate || undefined,
    securityDeposit: values.securityDeposit === "" ? undefined : Number(values.securityDeposit),
    baseRent: values.baseRent === "" ? undefined : Number(values.baseRent),
    rentFrequency: values.rentFrequency || undefined,
    squareFootageLeased: values.squareFootageLeased === "" ? undefined : Number(values.squareFootageLeased),
    unitLabel: values.unitLabel || undefined,
    // On edit, an explicit "No unit" selection must clear a prior link
    // (null), distinct from never having touched the field (undefined).
    propertyUnitId: values.propertyUnitId || (mode === "edit" ? null : undefined),
    notes: values.notes || undefined,
  };
}

export function LeaseForm({
  mode,
  leaseId,
  properties,
  tenants,
  initialValues,
}: {
  mode: "create" | "edit";
  leaseId?: string;
  properties: OptionRecord[];
  tenants: OptionRecord[];
  initialValues?: Partial<LeaseFormValues>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<LeaseFormValues>({ ...EMPTY_VALUES, ...initialValues });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [units, setUnits] = useState<UnitOption[]>([]);

  // Only shown when the selected property actually has units — no need to
  // separately thread a property-type "supportsUnits" flag down here.
  useEffect(() => {
    let cancelled = false;
    const request = values.propertyId
      ? fetch(`/api/properties/${values.propertyId}/units`).then((response) => (response.ok ? response.json() : null))
      : Promise.resolve(null);
    request.then((data) => {
      if (!cancelled) setUnits(data?.units ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [values.propertyId]);

  // Active units, plus the currently-assigned one even if it has since gone
  // inactive — so an existing lease's unit always still appears selected.
  const selectableUnits = units.filter((unit) => unit.isActive || unit.id === values.propertyUnitId);

  function update<K extends keyof LeaseFormValues>(key: K, value: LeaseFormValues[K]) {
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

    const payload = toPayload(values, mode);
    const schema = mode === "create" ? createLeaseSchema : updateLeaseSchema;
    const localResult = schema.safeParse(mode === "create" ? payload : { ...payload, propertyId: undefined, tenantId: undefined });
    if (!localResult.success) {
      setFieldErrors(mapFieldErrors(localResult.error.flatten().fieldErrors));
      setError(VALIDATION_BANNER_MESSAGE);
      return;
    }

    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/leases" : `/api/leases/${leaseId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const body = mode === "create" ? payload : { ...payload, propertyId: undefined, tenantId: undefined };
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
      router.push(`/leases/${data.lease.id}`);
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
          <label className="label" htmlFor="lease-property">Property</label>
          {mode === "edit" ? (
            <input className="input" value={properties.find((p) => p.id === values.propertyId)?.name ?? ""} disabled />
          ) : (
            <select
              id="lease-property"
              className="input"
              value={values.propertyId}
              onChange={(event) => update("propertyId", event.target.value)}
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
          )}
        </div>
        <div>
          <label className="label" htmlFor="lease-tenant">Tenant</label>
          {mode === "edit" ? (
            <input className="input" value={tenants.find((t) => t.id === values.tenantId)?.name ?? ""} disabled />
          ) : (
            <select
              id="lease-tenant"
              className="input"
              value={values.tenantId}
              onChange={(event) => update("tenantId", event.target.value)}
              {...invalidFieldProps(Boolean(fieldErrors.tenantId))}
              required
            >
              <option value="">Select a tenant…</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="label" htmlFor="lease-label">Lease label</label>
          <input
            id="lease-label"
            className="input"
            value={values.label}
            onChange={(event) => update("label", event.target.value)}
            {...invalidFieldProps(Boolean(fieldErrors.label))}
            placeholder="e.g. Unit 4B — Smith"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="lease-unit">Unit / suite (optional, free text)</label>
          <input
            id="lease-unit"
            className="input"
            value={values.unitLabel}
            onChange={(event) => update("unitLabel", event.target.value)}
          />
        </div>
        {selectableUnits.length > 0 ? (
          <div>
            <label className="label" htmlFor="lease-property-unit">Unit record (optional)</label>
            <select
              id="lease-property-unit"
              className="input"
              value={values.propertyUnitId}
              onChange={(event) => update("propertyUnitId", event.target.value)}
            >
              <option value="">No unit selected</option>
              {selectableUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.unitLabel}
                  {!unit.isActive ? " (inactive)" : ""}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div>
          <label className="label" htmlFor="lease-type">Lease type</label>
          <select id="lease-type" className="input" value={values.leaseType} onChange={(event) => update("leaseType", event.target.value as LeaseType)}>
            {LEASE_TYPES.map((type) => (
              <option key={type} value={type}>
                {LEASE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="lease-status">Status</label>
          <select id="lease-status" className="input" value={values.status} onChange={(event) => update("status", event.target.value as LeaseStatus)}>
            {LEASE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {LEASE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.9rem" }}>
        <div>
          <label className="label" htmlFor="lease-start-date">Start date</label>
          <input
            id="lease-start-date"
            type="date"
            className="input"
            value={values.startDate}
            onChange={(event) => update("startDate", event.target.value)}
            {...invalidFieldProps(Boolean(fieldErrors.startDate))}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="lease-end-date">End date (optional)</label>
          <input
            id="lease-end-date"
            type="date"
            className="input"
            value={values.endDate}
            onChange={(event) => update("endDate", event.target.value)}
            {...invalidFieldProps(Boolean(fieldErrors.endDate), "lease-end-date-error")}
          />
          {fieldErrors.endDate ? (
            <p id="lease-end-date-error" className="error-text" style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
              {fieldErrors.endDate}
            </p>
          ) : null}
        </div>
        <div>
          <label className="label" htmlFor="lease-notice-date">Notice date (optional)</label>
          <input
            id="lease-notice-date"
            type="date"
            className="input"
            value={values.noticeDate}
            onChange={(event) => update("noticeDate", event.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="lease-renewal-date">Renewal option date (optional)</label>
          <input
            id="lease-renewal-date"
            type="date"
            className="input"
            value={values.renewalOptionDate}
            onChange={(event) => update("renewalOptionDate", event.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="lease-move-in">Move-in date (optional)</label>
          <input
            id="lease-move-in"
            type="date"
            className="input"
            value={values.moveInDate}
            onChange={(event) => update("moveInDate", event.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="lease-move-out">Move-out date (optional)</label>
          <input
            id="lease-move-out"
            type="date"
            className="input"
            value={values.moveOutDate}
            onChange={(event) => update("moveOutDate", event.target.value)}
            {...invalidFieldProps(Boolean(fieldErrors.moveOutDate), "lease-move-out-error")}
          />
          {fieldErrors.moveOutDate ? (
            <p id="lease-move-out-error" className="error-text" style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
              {fieldErrors.moveOutDate}
            </p>
          ) : null}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.9rem" }}>
        <div>
          <label className="label" htmlFor="lease-base-rent">Base rent (optional)</label>
          <input
            id="lease-base-rent"
            type="number"
            min={0}
            step="0.01"
            className="input"
            value={values.baseRent}
            onChange={(event) => update("baseRent", event.target.value)}
            {...invalidFieldProps(Boolean(fieldErrors.baseRent))}
          />
        </div>
        <div>
          <label className="label" htmlFor="lease-rent-frequency">Rent frequency (optional)</label>
          <select
            id="lease-rent-frequency"
            className="input"
            value={values.rentFrequency}
            onChange={(event) => update("rentFrequency", event.target.value as RentFrequency)}
          >
            <option value="">Not set</option>
            {RENT_FREQUENCIES.map((frequency) => (
              <option key={frequency} value={frequency}>
                {RENT_FREQUENCY_LABELS[frequency]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="lease-security-deposit">Security deposit (optional)</label>
          <input
            id="lease-security-deposit"
            type="number"
            min={0}
            step="0.01"
            className="input"
            value={values.securityDeposit}
            onChange={(event) => update("securityDeposit", event.target.value)}
            {...invalidFieldProps(Boolean(fieldErrors.securityDeposit))}
          />
        </div>
        <div>
          <label className="label" htmlFor="lease-square-footage">Square footage leased (optional)</label>
          <input
            id="lease-square-footage"
            type="number"
            min={0}
            className="input"
            value={values.squareFootageLeased}
            onChange={(event) => update("squareFootageLeased", event.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="lease-notes">Notes (optional)</label>
        <textarea
          id="lease-notes"
          className="input"
          rows={3}
          value={values.notes}
          onChange={(event) => update("notes", event.target.value)}
        />
      </div>

      <button type="submit" className="button button-primary" disabled={submitting} style={{ alignSelf: "flex-start" }}>
        {submitting ? "Saving…" : mode === "create" ? "Create lease" : "Save changes"}
      </button>
    </form>
  );
}
