"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PM_DUE_STATES,
  PM_DUE_STATE_LABELS,
  type PmDueState,
} from "@/lib/preventive-maintenance/constants";
import { classifyDueState } from "@/lib/preventive-maintenance/recurrence";

interface OptionRecord {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  displayName: string;
}

interface PlanRow {
  id: string;
  name: string;
  propertyId: string;
  propertyEquipmentId: string | null;
  categoryId: string;
  nextDueAt: string;
  isActive: boolean;
  defaultAssigneeUserId: string | null;
}

const DUE_STATE_BADGE_STYLE: Record<PmDueState, { background: string; color: string }> = {
  overdue: { background: "#fee2e2", color: "#991b1b" },
  due_soon: { background: "#fef3c7", color: "#92400e" },
  upcoming: { background: "#e0f2fe", color: "#075985" },
};

function DueStateBadge({ nextDueAt }: { nextDueAt: string }) {
  const state = classifyDueState(nextDueAt);
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.15rem 0.5rem",
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 600,
        ...DUE_STATE_BADGE_STYLE[state],
      }}
    >
      {PM_DUE_STATE_LABELS[state]}
    </span>
  );
}

export function PreventiveMaintenanceListPanel({
  canCreate,
  initialPropertyId,
}: {
  canCreate: boolean;
  initialPropertyId?: string;
}) {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [properties, setProperties] = useState<OptionRecord[]>([]);
  const [assignees, setAssignees] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [propertyId, setPropertyId] = useState(initialPropertyId ?? "");
  const [active, setActive] = useState("true");
  const [dueState, setDueState] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");

  useEffect(() => {
    fetch("/api/properties?active=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setProperties(data.properties ?? []));
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setAssignees(data.users ?? []));
  }, []);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (propertyId) params.set("propertyId", propertyId);
    if (active) params.set("active", active);
    if (dueState) params.set("dueState", dueState);
    if (assignedUserId) params.set("assignedUserId", assignedUserId);

    return fetch(`/api/preventive-maintenance-plans?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setPlans(data.plans ?? []);
      });
  }, [search, propertyId, active, dueState, assignedUserId]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(handle);
  }, [load]);

  const propertyNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const property of properties) map.set(property.id, property.name);
    return map;
  }, [properties]);

  const assigneeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const assignee of assignees) map.set(assignee.id, assignee.displayName);
    return map;
  }, [assignees]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", flex: 1 }}>
          <input
            className="input"
            style={{ maxWidth: 220 }}
            placeholder="Search plans…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className="input" style={{ maxWidth: 180 }} value={propertyId} onChange={(event) => setPropertyId(event.target.value)}>
            <option value="">All properties</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <select className="input" style={{ maxWidth: 150 }} value={active} onChange={(event) => setActive(event.target.value)}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
            <option value="">All</option>
          </select>
          <select className="input" style={{ maxWidth: 150 }} value={dueState} onChange={(event) => setDueState(event.target.value)}>
            <option value="">Any due state</option>
            {PM_DUE_STATES.map((value) => (
              <option key={value} value={value}>
                {PM_DUE_STATE_LABELS[value]}
              </option>
            ))}
          </select>
          <select
            className="input"
            style={{ maxWidth: 170 }}
            value={assignedUserId}
            onChange={(event) => setAssignedUserId(event.target.value)}
          >
            <option value="">Any assignee</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.displayName}
              </option>
            ))}
          </select>
        </div>
        {canCreate ? (
          <Link
            href={initialPropertyId ? `/preventive-maintenance/new?propertyId=${initialPropertyId}` : "/preventive-maintenance/new"}
            className="button button-primary"
          >
            New Plan
          </Link>
        ) : null}
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : plans.length === 0 ? (
          <p className="muted">
            No preventive maintenance plans match your filters yet.{" "}
            {canCreate ? <Link href="/preventive-maintenance/new">Create the first one.</Link> : null}
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "0.5rem" }}>Plan</th>
                  <th style={{ padding: "0.5rem" }}>Property</th>
                  <th style={{ padding: "0.5rem" }}>Next due</th>
                  <th style={{ padding: "0.5rem" }}>Due state</th>
                  <th style={{ padding: "0.5rem" }}>Status</th>
                  <th style={{ padding: "0.5rem" }}>Assignee</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.5rem" }}>
                      <Link href={`/preventive-maintenance/${plan.id}`}>{plan.name}</Link>
                    </td>
                    <td style={{ padding: "0.5rem" }}>{propertyNameById.get(plan.propertyId) ?? "—"}</td>
                    <td style={{ padding: "0.5rem" }}>{plan.nextDueAt}</td>
                    <td style={{ padding: "0.5rem" }}>
                      {plan.isActive ? <DueStateBadge nextDueAt={plan.nextDueAt} /> : "—"}
                    </td>
                    <td style={{ padding: "0.5rem" }}>{plan.isActive ? "Active" : "Inactive"}</td>
                    <td style={{ padding: "0.5rem" }}>
                      {plan.defaultAssigneeUserId ? (assigneeNameById.get(plan.defaultAssigneeUserId) ?? "—") : "Unassigned"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
