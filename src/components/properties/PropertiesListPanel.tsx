"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { OCCUPANCY_MODEL_LABELS, type OccupancyModel } from "@/lib/properties/constants";

interface PropertyTypeOption {
  id: string;
  name: string;
}

interface PropertyCompanyOption {
  id: string;
  name: string;
}

interface PropertyRow {
  id: string;
  name: string;
  propertyCode: string | null;
  propertyTypeId: string;
  propertyCompanyId: string | null;
  occupancyModel: string;
  isActive: boolean;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
}

export function PropertiesListPanel({ canCreate }: { canCreate: boolean }) {
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<PropertyTypeOption[]>([]);
  const [propertyCompanies, setPropertyCompanies] = useState<PropertyCompanyOption[]>([]);
  const [coverFileIdByProperty, setCoverFileIdByProperty] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [propertyTypeId, setPropertyTypeId] = useState("");
  const [propertyCompanyId, setPropertyCompanyId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");

  useEffect(() => {
    fetch("/api/property-types")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) {
          setPropertyTypes(data.propertyTypes ?? []);
        }
      });
    fetch("/api/property-companies")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) {
          setPropertyCompanies(data.propertyCompanies ?? []);
        }
      });
    fetch("/api/property-photos/covers")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) {
          setCoverFileIdByProperty(
            new Map((data.covers ?? []).map((cover: { propertyId: string; fileId: string }) => [cover.propertyId, cover.fileId])),
          );
        }
      });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("search", search.trim());
    }
    if (propertyTypeId) {
      params.set("propertyTypeId", propertyTypeId);
    }
    if (propertyCompanyId) {
      params.set("propertyCompanyId", propertyCompanyId);
    }
    if (statusFilter !== "all") {
      params.set("active", statusFilter === "active" ? "true" : "false");
    }

    const handle = setTimeout(() => {
      setLoading(true);
      fetch(`/api/properties?${params.toString()}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (data) {
            setProperties(data.properties ?? []);
          }
        })
        .finally(() => setLoading(false));
    }, 200);

    return () => clearTimeout(handle);
  }, [search, propertyTypeId, propertyCompanyId, statusFilter]);

  const typeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const type of propertyTypes) {
      map.set(type.id, type.name);
    }
    return map;
  }, [propertyTypes]);

  const companyNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const company of propertyCompanies) {
      map.set(company.id, company.name);
    }
    return map;
  }, [propertyCompanies]);

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
            style={{ maxWidth: 260 }}
            placeholder="Search properties…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="input"
            style={{ maxWidth: 220 }}
            value={propertyTypeId}
            onChange={(event) => setPropertyTypeId(event.target.value)}
          >
            <option value="">All property types</option>
            {propertyTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            style={{ maxWidth: 220 }}
            value={propertyCompanyId}
            onChange={(event) => setPropertyCompanyId(event.target.value)}
          >
            <option value="">All property companies</option>
            <option value="unassigned">Unassigned</option>
            {propertyCompanies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            style={{ maxWidth: 160 }}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All statuses</option>
          </select>
        </div>
        {canCreate ? (
          <Link href="/properties/new" className="button button-primary">
            Add Property
          </Link>
        ) : null}
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : properties.length === 0 ? (
          <p className="muted">
            No properties match your filters yet.{" "}
            {canCreate ? <Link href="/properties/new">Add the first one.</Link> : null}
          </p>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {properties.map((property) => (
              <li key={property.id} style={{ opacity: property.isActive ? 1 : 0.6 }}>
                <Link
                  href={`/properties/${property.id}`}
                  style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}
                >
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    {coverFileIdByProperty.has(property.id) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/files/${coverFileIdByProperty.get(property.id)}?inline=1`}
                        alt=""
                        style={{ width: 56, height: 42, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                      />
                    ) : null}
                    <div>
                      <div style={{ fontWeight: 600 }}>{property.name}</div>
                      <div className="muted" style={{ fontSize: "0.85rem" }}>
                        {[property.addressLine1, property.city, property.state].filter(Boolean).join(", ") ||
                          "No address on file"}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: "0.85rem" }} className="muted">
                    <div>{typeNameById.get(property.propertyTypeId) ?? "Unknown type"}</div>
                    {property.propertyCompanyId ? (
                      <div>{companyNameById.get(property.propertyCompanyId) ?? "Unknown company"}</div>
                    ) : null}
                    <div>
                      {OCCUPANCY_MODEL_LABELS[property.occupancyModel as OccupancyModel] ??
                        property.occupancyModel}
                      {!property.isActive ? " · Inactive" : ""}
                    </div>
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
