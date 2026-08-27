"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_STATUSES,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_PRIORITIES,
  type WorkOrderPriority,
  type WorkOrderStatus,
} from "@/lib/work-orders/constants";

interface OptionRecord {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  displayName: string;
}

interface WorkOrderRow {
  id: string;
  number: string;
  subject: string;
  propertyId: string;
  categoryId: string;
  priority: string;
  status: string;
  assignedUserId: string | null;
  updatedAt: string;
}

export function WorkOrdersListPanel({
  canCreate,
  initialPropertyId,
}: {
  canCreate: boolean;
  initialPropertyId?: string;
}) {
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([]);
  const [properties, setProperties] = useState<OptionRecord[]>([]);
  const [categories, setCategories] = useState<OptionRecord[]>([]);
  const [assignees, setAssignees] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [propertyId, setPropertyId] = useState(initialPropertyId ?? "");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");

  useEffect(() => {
    fetch("/api/properties?active=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setProperties(data.properties ?? []));
    fetch("/api/work-order-categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setCategories(data.categories ?? []));
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setAssignees(data.users ?? []));
  }, []);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (propertyId) params.set("propertyId", propertyId);
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (categoryId) params.set("categoryId", categoryId);
    if (assignedUserId) params.set("assignedUserId", assignedUserId);

    return fetch(`/api/work-orders?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setWorkOrders(data.workOrders ?? []);
      });
  }, [search, propertyId, status, priority, categoryId, assignedUserId]);

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

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories) map.set(category.id, category.name);
    return map;
  }, [categories]);

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
            placeholder="Search work orders…"
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
          <select className="input" style={{ maxWidth: 150 }} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {WORK_ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {WORK_ORDER_STATUS_LABELS[value as WorkOrderStatus]}
              </option>
            ))}
          </select>
          <select className="input" style={{ maxWidth: 140 }} value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="">All priorities</option>
            {WORK_ORDER_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {WORK_ORDER_PRIORITY_LABELS[value as WorkOrderPriority]}
              </option>
            ))}
          </select>
          <select className="input" style={{ maxWidth: 170 }} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
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
            href={initialPropertyId ? `/work-orders/new?propertyId=${initialPropertyId}` : "/work-orders/new"}
            className="button button-primary"
          >
            New Work Order
          </Link>
        ) : null}
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : workOrders.length === 0 ? (
          <p className="muted">
            No work orders match your filters yet.{" "}
            {canCreate ? <Link href="/work-orders/new">Create the first one.</Link> : null}
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "0.5rem" }}>Number</th>
                  <th style={{ padding: "0.5rem" }}>Subject</th>
                  <th style={{ padding: "0.5rem" }}>Property</th>
                  <th style={{ padding: "0.5rem" }}>Category</th>
                  <th style={{ padding: "0.5rem" }}>Priority</th>
                  <th style={{ padding: "0.5rem" }}>Status</th>
                  <th style={{ padding: "0.5rem" }}>Assigned</th>
                  <th style={{ padding: "0.5rem" }}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.map((wo) => (
                  <tr key={wo.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.5rem" }}>
                      <Link href={`/work-orders/${wo.id}`}>{wo.number}</Link>
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      <Link href={`/work-orders/${wo.id}`}>{wo.subject}</Link>
                    </td>
                    <td style={{ padding: "0.5rem" }}>{propertyNameById.get(wo.propertyId) ?? "—"}</td>
                    <td style={{ padding: "0.5rem" }}>{categoryNameById.get(wo.categoryId) ?? "—"}</td>
                    <td style={{ padding: "0.5rem" }}>
                      {WORK_ORDER_PRIORITY_LABELS[wo.priority as WorkOrderPriority] ?? wo.priority}
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      {WORK_ORDER_STATUS_LABELS[wo.status as WorkOrderStatus] ?? wo.status}
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      {wo.assignedUserId ? (assigneeNameById.get(wo.assignedUserId) ?? "—") : "Unassigned"}
                    </td>
                    <td className="muted" style={{ padding: "0.5rem" }}>
                      {new Date(wo.updatedAt).toLocaleString()}
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
