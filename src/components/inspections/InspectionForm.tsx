"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { UnitSelect, type UnitSelectOptions } from "@/components/shared/UnitSelect";
import { VALIDATION_BANNER_MESSAGE, describeApiError, invalidFieldProps, mapFieldErrors } from "@/lib/forms/field-errors";
import { defaultNewRecordUnitId, filterEquipmentForUnit } from "@/lib/property-units/unit-display";
import { createInspectionSchema } from "@/lib/validation/inspections";

interface OptionRecord {
  id: string;
  name: string;
}

interface TemplateOption {
  id: string;
  name: string;
  propertyTypeId: string | null;
}

interface EquipmentOption {
  id: string;
  displayName: string;
  propertyUnitId: string | null;
}

interface UserOption {
  id: string;
  displayName: string;
}

export function InspectionForm({
  properties,
  users,
  initialPropertyId,
  initialEquipmentId,
}: {
  properties: (OptionRecord & { propertyTypeId: string })[];
  users: UserOption[];
  initialPropertyId?: string;
  initialEquipmentId?: string;
}) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(initialPropertyId ?? "");
  const [propertyEquipmentId, setPropertyEquipmentId] = useState(initialEquipmentId ?? "");
  const [templateId, setTemplateId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [inspectorUserId, setInspectorUserId] = useState("");
  const [equipmentOptions, setEquipmentOptions] = useState<EquipmentOption[]>([]);
  // UNIT-OPS-1: the Unit belongs to this Inspection instance, never to the
  // (reusable) template. null = Property-wide / Shared.
  const [propertyUnitId, setPropertyUnitId] = useState<string | null>(null);
  const [unitOptions, setUnitOptions] = useState<UnitSelectOptions | null>(null);
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const request = propertyId
      ? fetch(`/api/properties/${propertyId}/equipment?activeOnly=true`).then((r) => (r.ok ? r.json() : null))
      : Promise.resolve(null);
    const unitRequest = propertyId
      ? fetch(`/api/properties/${propertyId}/unit-options`).then((r) => (r.ok ? r.json() : null))
      : Promise.resolve(null);
    Promise.all([request, unitRequest]).then(([data, unitData]) => {
      const options: EquipmentOption[] = data?.equipment ?? [];
      const nextUnitOptions: UnitSelectOptions | null = unitData?.unitOptions ?? null;
      setEquipmentOptions(options);
      setUnitOptions(nextUnitOptions);
      setPropertyEquipmentId((current) => (current && !options.some((o) => o.id === current) ? "" : current));
      const prefilled = options.find((option) => option.id === initialEquipmentId);
      setPropertyUnitId(
        prefilled?.propertyUnitId ??
          (nextUnitOptions?.supportsUnits ? defaultNewRecordUnitId(nextUnitOptions) : null),
      );
    });
  }, [propertyId, initialEquipmentId]);

  const selectedEquipment = equipmentOptions.find((option) => option.id === propertyEquipmentId) ?? null;
  // UNIT-OPS-1: Unit-owned Equipment pins the Inspection to its Unit.
  const unitLockedByEquipment = Boolean(selectedEquipment?.propertyUnitId);
  const visibleEquipmentOptions = filterEquipmentForUnit(equipmentOptions, propertyUnitId);

  function handleEquipmentChange(equipmentId: string) {
    setPropertyEquipmentId(equipmentId);
    const equipment = equipmentOptions.find((option) => option.id === equipmentId);
    if (equipment?.propertyUnitId) {
      setPropertyUnitId(equipment.propertyUnitId);
    }
  }

  useEffect(() => {
    fetch("/api/inspection-templates?activeOnly=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setTemplateOptions(data.templates ?? []));
  }, []);

  const selectedProperty = properties.find((property) => property.id === propertyId);
  const applicableTemplates = templateOptions.filter(
    (template) => !template.propertyTypeId || template.propertyTypeId === selectedProperty?.propertyTypeId,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const payload = {
      propertyId,
      propertyUnitId: unitOptions?.supportsUnits ? propertyUnitId : undefined,
      propertyEquipmentId: propertyEquipmentId || undefined,
      templateId,
      scheduledDate: scheduledDate || undefined,
      inspectorUserId: inspectorUserId || undefined,
    };

    const localResult = createInspectionSchema.safeParse(payload);
    if (!localResult.success) {
      setFieldErrors(mapFieldErrors(localResult.error.flatten().fieldErrors));
      setError(VALIDATION_BANNER_MESSAGE);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/inspections", {
        method: "POST",
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
          setError(data?.message ?? describeApiError(data?.error));
        }
        return;
      }
      router.push(`/inspections/${data.inspection.id}`);
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
          <label className="label" htmlFor="inspection-property">
            Property
          </label>
          <select
            id="inspection-property"
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
        <UnitSelect
          id="inspection-unit"
          value={propertyUnitId}
          onChange={setPropertyUnitId}
          options={unitOptions}
          allowShared
          disabled={unitLockedByEquipment}
          hint={unitLockedByEquipment ? "Set by the selected equipment's Unit/Suite." : null}
        />
        <div>
          <label className="label" htmlFor="inspection-equipment">
            Equipment (optional)
          </label>
          <select
            id="inspection-equipment"
            className="input"
            value={propertyEquipmentId}
            onChange={(event) => handleEquipmentChange(event.target.value)}
            disabled={!propertyId || visibleEquipmentOptions.length === 0}
          >
            <option value="">No specific equipment</option>
            {visibleEquipmentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.displayName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="inspection-template">
            Inspection template
          </label>
          <select
            id="inspection-template"
            className="input"
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
            {...invalidFieldProps(Boolean(fieldErrors.templateId))}
            required
          >
            <option value="">Select a template…</option>
            {applicableTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="inspection-scheduled-date">
            Scheduled date (optional)
          </label>
          <input
            id="inspection-scheduled-date"
            type="date"
            className="input"
            value={scheduledDate}
            onChange={(event) => setScheduledDate(event.target.value)}
            {...invalidFieldProps(Boolean(fieldErrors.scheduledDate))}
          />
        </div>
        <div>
          <label className="label" htmlFor="inspection-inspector">
            Inspector (optional)
          </label>
          <select
            id="inspection-inspector"
            className="input"
            value={inspectorUserId}
            onChange={(event) => setInspectorUserId(event.target.value)}
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button type="submit" className="button button-primary" disabled={submitting} style={{ alignSelf: "flex-start" }}>
        {submitting ? "Starting…" : "Start inspection"}
      </button>
    </form>
  );
}
