"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { WORK_ORDER_PRIORITIES, WORK_ORDER_PRIORITY_LABELS } from "@/lib/work-orders/constants";

interface OptionRecord {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  displayName: string;
  email: string;
}

interface EquipmentOption {
  id: string;
  displayName: string;
}

export function WorkOrderForm({
  properties,
  categories,
  users,
  initialPropertyId,
  initialEquipmentId,
}: {
  properties: OptionRecord[];
  categories: OptionRecord[];
  users: UserOption[];
  initialPropertyId?: string;
  initialEquipmentId?: string;
}) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(initialPropertyId ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState("normal");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [requesterUserId, setRequesterUserId] = useState("");
  const [propertyEquipmentId, setPropertyEquipmentId] = useState(initialEquipmentId ?? "");
  const [equipmentOptions, setEquipmentOptions] = useState<EquipmentOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const request = propertyId
      ? fetch(`/api/properties/${propertyId}/equipment?activeOnly=true`).then((response) =>
          response.ok ? response.json() : null,
        )
      : Promise.resolve(null);

    request.then((data) => {
      const options: EquipmentOption[] = data?.equipment ?? [];
      setEquipmentOptions(options);
      setPropertyEquipmentId((current) =>
        current && !options.some((option) => option.id === current) ? "" : current,
      );
    });
  }, [propertyId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!propertyId) {
      setError("Select a property.");
      return;
    }
    if (!categoryId) {
      setError("Select a category.");
      return;
    }
    if (!subject.trim()) {
      setError("Enter a subject.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          propertyEquipmentId: propertyEquipmentId || undefined,
          categoryId,
          priority,
          subject,
          description,
          assignedUserId: assignedUserId || undefined,
          requesterUserId: requesterUserId || undefined,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.message ?? "Could not create the work order.");
        return;
      }
      router.push(`/work-orders/${data.workOrder.id}`);
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
          <label className="label" htmlFor="wo-property">
            Property
          </label>
          <select
            id="wo-property"
            className="input"
            value={propertyId}
            onChange={(event) => setPropertyId(event.target.value)}
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
          <label className="label" htmlFor="wo-category">
            Category
          </label>
          <select
            id="wo-category"
            className="input"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
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
          <label className="label" htmlFor="wo-equipment">
            Related equipment (optional)
          </label>
          <select
            id="wo-equipment"
            className="input"
            value={propertyEquipmentId}
            onChange={(event) => setPropertyEquipmentId(event.target.value)}
            disabled={!propertyId || equipmentOptions.length === 0}
          >
            <option value="">None</option>
            {equipmentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.displayName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="wo-priority">
            Priority
          </label>
          <select
            id="wo-priority"
            className="input"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            {WORK_ORDER_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {WORK_ORDER_PRIORITY_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="wo-assignee">
            Assign to (optional)
          </label>
          <select
            id="wo-assignee"
            className="input"
            value={assignedUserId}
            onChange={(event) => setAssignedUserId(event.target.value)}
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
          <label className="label" htmlFor="wo-requester">
            Requester (optional — defaults to you)
          </label>
          <select
            id="wo-requester"
            className="input"
            value={requesterUserId}
            onChange={(event) => setRequesterUserId(event.target.value)}
          >
            <option value="">Me</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="wo-subject">
          Subject
        </label>
        <input
          id="wo-subject"
          className="input"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="wo-description">
          Description
        </label>
        <textarea
          id="wo-description"
          className="input"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <button
        type="submit"
        className="button button-primary"
        disabled={submitting}
        style={{ alignSelf: "flex-start" }}
      >
        {submitting ? "Creating…" : "Create work order"}
      </button>
    </form>
  );
}
