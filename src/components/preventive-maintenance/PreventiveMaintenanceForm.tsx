"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import {
  PM_INTERVAL_UNITS,
  PM_RECURRENCE_PRESETS,
  PM_RECURRENCE_PRESET_LABELS,
  type PmIntervalUnit,
  type PmRecurrencePreset,
} from "@/lib/preventive-maintenance/constants";
import { COMPONENT_TYPE_LABELS, type ComponentType } from "@/lib/property-components/constants";
import { WORK_ORDER_PRIORITIES, WORK_ORDER_PRIORITY_LABELS } from "@/lib/work-orders/constants";

interface OptionRecord {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  displayName: string;
}

interface EquipmentOption {
  id: string;
  displayName: string;
}

interface ComponentOption {
  id: string;
  componentType: string;
  otherTypeLabel: string | null;
  name: string | null;
}

function componentLabel(component: ComponentOption): string {
  const typeLabel = COMPONENT_TYPE_LABELS[component.componentType as ComponentType] ?? component.componentType;
  const label = component.componentType === "other" && component.otherTypeLabel ? component.otherTypeLabel : typeLabel;
  return component.name ? `${label} — ${component.name}` : label;
}

interface VendorOption {
  id: string;
  name: string;
}

export interface PreventiveMaintenanceFormValues {
  propertyId: string;
  propertyEquipmentId: string;
  propertyComponentId: string;
  categoryId: string;
  name: string;
  description: string;
  instructions: string;
  defaultPriority: string;
  defaultAssigneeUserId: string;
  defaultVendorId: string;
  recurrencePreset: PmRecurrencePreset;
  customIntervalUnit: PmIntervalUnit;
  customIntervalValue: string;
  nextDueAt: string;
}

const EMPTY_VALUES: PreventiveMaintenanceFormValues = {
  propertyId: "",
  propertyEquipmentId: "",
  propertyComponentId: "",
  categoryId: "",
  name: "",
  description: "",
  instructions: "",
  defaultPriority: "normal",
  defaultAssigneeUserId: "",
  defaultVendorId: "",
  recurrencePreset: "monthly",
  customIntervalUnit: "month",
  customIntervalValue: "1",
  nextDueAt: "",
};

function resolveInterval(values: PreventiveMaintenanceFormValues): {
  intervalUnit: PmIntervalUnit;
  intervalValue: number;
} {
  if (values.recurrencePreset === "custom") {
    return {
      intervalUnit: values.customIntervalUnit,
      intervalValue: Number(values.customIntervalValue) || 1,
    };
  }
  const preset = PM_RECURRENCE_PRESETS[values.recurrencePreset];
  return { intervalUnit: preset.unit, intervalValue: preset.value };
}

export function PreventiveMaintenanceForm({
  mode,
  planId,
  properties,
  categories,
  users,
  vendors,
  propertyName,
  initialValues,
}: {
  mode: "create" | "edit";
  planId?: string;
  properties: OptionRecord[];
  categories: OptionRecord[];
  users: UserOption[];
  vendors: VendorOption[];
  propertyName?: string;
  initialValues?: Partial<PreventiveMaintenanceFormValues>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<PreventiveMaintenanceFormValues>({
    ...EMPTY_VALUES,
    ...initialValues,
  });
  const [equipmentOptions, setEquipmentOptions] = useState<EquipmentOption[]>([]);
  const [componentOptions, setComponentOptions] = useState<ComponentOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof PreventiveMaintenanceFormValues>(
    key: K,
    value: PreventiveMaintenanceFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    const request = values.propertyId
      ? fetch(`/api/properties/${values.propertyId}/equipment?activeOnly=true`).then((response) =>
          response.ok ? response.json() : null,
        )
      : Promise.resolve(null);

    request.then((data) => {
      const options: EquipmentOption[] = data?.equipment ?? [];
      setEquipmentOptions(options);
      setValues((prev) => ({
        ...prev,
        propertyEquipmentId: options.some((option) => option.id === prev.propertyEquipmentId)
          ? prev.propertyEquipmentId
          : "",
      }));
    });

    const componentRequest = values.propertyId
      ? fetch(`/api/properties/${values.propertyId}/components?activeOnly=true`).then((response) =>
          response.ok ? response.json() : null,
        )
      : Promise.resolve(null);

    componentRequest.then((data) => {
      const options: ComponentOption[] = data?.components ?? [];
      setComponentOptions(options);
      setValues((prev) => ({
        ...prev,
        propertyComponentId: options.some((option) => option.id === prev.propertyComponentId)
          ? prev.propertyComponentId
          : "",
      }));
    });
  }, [values.propertyId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (mode === "create" && !values.propertyId) {
      setError("Select a property.");
      return;
    }
    if (!values.categoryId) {
      setError("Select a category.");
      return;
    }
    if (!values.name.trim()) {
      setError("Enter a plan name.");
      return;
    }
    if (mode === "create" && !values.nextDueAt) {
      setError("Enter the first due date.");
      return;
    }

    const { intervalUnit, intervalValue } = resolveInterval(values);

    const payload = {
      ...(mode === "create" ? { propertyId: values.propertyId } : {}),
      propertyEquipmentId: values.propertyEquipmentId || null,
      propertyComponentId: values.propertyComponentId || null,
      categoryId: values.categoryId,
      name: values.name,
      description: values.description || undefined,
      instructions: values.instructions || undefined,
      defaultPriority: values.defaultPriority,
      defaultAssigneeUserId: values.defaultAssigneeUserId || null,
      defaultVendorId: values.defaultVendorId || null,
      intervalUnit,
      intervalValue,
      ...(values.nextDueAt ? { nextDueAt: values.nextDueAt } : {}),
    };

    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/preventive-maintenance-plans" : `/api/preventive-maintenance-plans/${planId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Could not save the plan. Check the fields and try again.");
        return;
      }
      router.push(`/preventive-maintenance/${data.plan.id}`);
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
          <label className="label" htmlFor="pm-property">
            Property
          </label>
          {mode === "edit" ? (
            <input className="input" value={propertyName ?? ""} disabled />
          ) : (
            <select
              id="pm-property"
              className="input"
              value={values.propertyId}
              onChange={(event) => update("propertyId", event.target.value)}
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
          <label className="label" htmlFor="pm-equipment">
            Equipment (optional)
          </label>
          <select
            id="pm-equipment"
            className="input"
            value={values.propertyEquipmentId}
            onChange={(event) => update("propertyEquipmentId", event.target.value)}
            disabled={mode === "create" && (!values.propertyId || equipmentOptions.length === 0)}
          >
            <option value="">Whole property</option>
            {equipmentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.displayName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pm-component">
            Property component (optional)
          </label>
          <select
            id="pm-component"
            className="input"
            value={values.propertyComponentId}
            onChange={(event) => update("propertyComponentId", event.target.value)}
            disabled={mode === "create" && (!values.propertyId || componentOptions.length === 0)}
          >
            <option value="">None</option>
            {componentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {componentLabel(option)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pm-category">
            Work order category
          </label>
          <select
            id="pm-category"
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
          <label className="label" htmlFor="pm-priority">
            Default priority
          </label>
          <select
            id="pm-priority"
            className="input"
            value={values.defaultPriority}
            onChange={(event) => update("defaultPriority", event.target.value)}
          >
            {WORK_ORDER_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {WORK_ORDER_PRIORITY_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pm-assignee">
            Default assignee (optional)
          </label>
          <select
            id="pm-assignee"
            className="input"
            value={values.defaultAssigneeUserId}
            onChange={(event) => update("defaultAssigneeUserId", event.target.value)}
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pm-vendor">
            Default vendor (optional)
          </label>
          <select
            id="pm-vendor"
            className="input"
            value={values.defaultVendorId}
            onChange={(event) => update("defaultVendorId", event.target.value)}
          >
            <option value="">None</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="pm-name">
          Plan name
        </label>
        <input
          id="pm-name"
          className="input"
          value={values.name}
          onChange={(event) => update("name", event.target.value)}
          placeholder="e.g. Quarterly HVAC filter change"
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="pm-description">
          Description (optional)
        </label>
        <textarea
          id="pm-description"
          className="input"
          rows={2}
          value={values.description}
          onChange={(event) => update("description", event.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="pm-instructions">
          Maintenance instructions / checklist (optional)
        </label>
        <textarea
          id="pm-instructions"
          className="input"
          rows={4}
          value={values.instructions}
          onChange={(event) => update("instructions", event.target.value)}
          placeholder="Copied onto each generated work order."
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.9rem" }}>
        <div>
          <label className="label" htmlFor="pm-recurrence">
            Recurrence
          </label>
          <select
            id="pm-recurrence"
            className="input"
            value={values.recurrencePreset}
            onChange={(event) => update("recurrencePreset", event.target.value as PmRecurrencePreset)}
          >
            {(Object.keys(PM_RECURRENCE_PRESET_LABELS) as PmRecurrencePreset[]).map((preset) => (
              <option key={preset} value={preset}>
                {PM_RECURRENCE_PRESET_LABELS[preset]}
              </option>
            ))}
          </select>
        </div>
        {values.recurrencePreset === "custom" ? (
          <>
            <div>
              <label className="label" htmlFor="pm-interval-unit">
                Every
              </label>
              <select
                id="pm-interval-unit"
                className="input"
                value={values.customIntervalUnit}
                onChange={(event) => update("customIntervalUnit", event.target.value as PmIntervalUnit)}
              >
                {PM_INTERVAL_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit === "week" ? "Week(s)" : "Month(s)"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="pm-interval-value">
                Count
              </label>
              <input
                id="pm-interval-value"
                type="number"
                min={1}
                max={60}
                className="input"
                value={values.customIntervalValue}
                onChange={(event) => update("customIntervalValue", event.target.value)}
              />
            </div>
          </>
        ) : null}
        <div>
          <label className="label" htmlFor="pm-next-due">
            {mode === "create" ? "First due date" : "Next due date"}
          </label>
          <input
            id="pm-next-due"
            type="date"
            className="input"
            value={values.nextDueAt}
            onChange={(event) => update("nextDueAt", event.target.value)}
            required={mode === "create"}
          />
        </div>
      </div>

      <button
        type="submit"
        className="button button-primary"
        disabled={submitting}
        style={{ alignSelf: "flex-start" }}
      >
        {submitting ? "Saving…" : mode === "create" ? "Create plan" : "Save changes"}
      </button>
    </form>
  );
}
