"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  ASSET_CONDITIONS,
  ASSET_CONDITION_LABELS,
  ASSET_STATUSES,
  ASSET_STATUS_LABELS,
  type AssetCondition,
  type AssetStatus,
} from "@/lib/assets/constants";

interface CategoryOption {
  id: string;
  name: string;
}

interface PersonOption {
  id: string;
  displayName: string;
}

interface PropertyOption {
  id: string;
  name: string;
}

interface AssetRow {
  id: string;
  assetTag: string;
  displayName: string;
  categoryId: string;
  model: string | null;
  serialNumber: string | null;
  status: string;
  condition: string;
  assignmentType: string;
  assignedPersonId: string | null;
  assignedPropertyId: string | null;
  isActive: boolean;
}

export function AssetsListPanel({ canCreate }: { canCreate: boolean }) {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");
  const [condition, setCondition] = useState("");
  const [assignmentType, setAssignmentType] = useState("");

  useEffect(() => {
    fetch("/api/asset-categories")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setCategories(data.categories ?? []);
      });
    fetch("/api/people")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setPeople(data.people ?? []);
      });
    fetch("/api/properties")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setProperties(data.properties ?? []);
      });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (categoryId) params.set("categoryId", categoryId);
    if (status) params.set("status", status);
    if (condition) params.set("condition", condition);
    if (assignmentType) params.set("assignmentType", assignmentType);

    const handle = setTimeout(() => {
      setLoading(true);
      fetch(`/api/assets?${params.toString()}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (data) setAssets(data.assets ?? []);
        })
        .finally(() => setLoading(false));
    }, 200);

    return () => clearTimeout(handle);
  }, [search, categoryId, status, condition, assignmentType]);

  const categoryNameById = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const personNameById = useMemo(() => new Map(people.map((p) => [p.id, p.displayName])), [people]);
  const propertyNameById = useMemo(() => new Map(properties.map((p) => [p.id, p.name])), [properties]);

  function currentHolder(asset: AssetRow): string {
    if (asset.assignmentType === "person" && asset.assignedPersonId) {
      return personNameById.get(asset.assignedPersonId) ?? "Unknown person";
    }
    if (asset.assignmentType === "property" && asset.assignedPropertyId) {
      return propertyNameById.get(asset.assignedPropertyId) ?? "Unknown property";
    }
    return "Unassigned / back stock";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", flex: 1 }}>
          <input
            className="input"
            style={{ maxWidth: 240 }}
            placeholder="Search assets…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className="input" style={{ maxWidth: 200 }} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select className="input" style={{ maxWidth: 160 }} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {ASSET_STATUSES.map((value) => (
              <option key={value} value={value}>
                {ASSET_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
          <select className="input" style={{ maxWidth: 160 }} value={condition} onChange={(event) => setCondition(event.target.value)}>
            <option value="">All conditions</option>
            {ASSET_CONDITIONS.map((value) => (
              <option key={value} value={value}>
                {ASSET_CONDITION_LABELS[value]}
              </option>
            ))}
          </select>
          <select
            className="input"
            style={{ maxWidth: 200 }}
            value={assignmentType}
            onChange={(event) => setAssignmentType(event.target.value)}
          >
            <option value="">Any assignment</option>
            <option value="person">Assigned to person</option>
            <option value="property">Assigned to property</option>
            <option value="unassigned">Unassigned / back stock</option>
          </select>
        </div>
        {canCreate ? (
          <Link href="/assets/new" className="button button-primary">
            Add Asset
          </Link>
        ) : null}
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : assets.length === 0 ? (
          <p className="muted">
            No assets match your filters yet.{" "}
            {canCreate ? <Link href="/assets/new">Add the first one.</Link> : null}
          </p>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {assets.map((asset) => (
              <li key={asset.id} style={{ opacity: asset.isActive ? 1 : 0.6 }}>
                <Link
                  href={`/assets/${asset.id}`}
                  style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {asset.assetTag} · {asset.displayName}
                    </div>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {categoryNameById.get(asset.categoryId) ?? "Unknown category"}
                      {[asset.model, asset.serialNumber].some(Boolean)
                        ? ` · ${[asset.model, asset.serialNumber].filter(Boolean).join(" / ")}`
                        : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: "0.85rem" }} className="muted">
                    <div>
                      {ASSET_STATUS_LABELS[asset.status as AssetStatus] ?? asset.status}
                      {" · "}
                      {ASSET_CONDITION_LABELS[asset.condition as AssetCondition] ?? asset.condition}
                    </div>
                    <div>{currentHolder(asset)}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
