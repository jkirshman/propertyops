"use client";

import { useEffect, useState } from "react";

interface RoleWithCapabilities {
  id: string;
  name: string;
  slug: string;
  capabilityKeys: string[];
}

export function RolesPanel() {
  const [roles, setRoles] = useState<RoleWithCapabilities[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/roles")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setRoles(data.roles ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="muted">Loading…</p>;
  }
  if (roles.length === 0) {
    return <p className="muted">No roles found.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <p className="muted" style={{ fontSize: "0.85rem" }}>
        Roles and their capabilities are inspected here; capability editing is not available yet. Assign an
        existing role to a user from that user&apos;s detail page under Users &amp; Access.
      </p>
      {roles.map((role) => {
        const expanded = expandedRoleId === role.id;
        return (
          <div key={role.id} className="card">
            <button
              type="button"
              onClick={() => setExpandedRoleId(expanded ? null : role.id)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                textAlign: "left",
              }}
            >
              <strong>{role.name}</strong>
              <span className="muted">{role.capabilityKeys.length} capabilities</span>
            </button>
            {expanded ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.6rem" }}>
                {role.capabilityKeys.length === 0 ? (
                  <span className="muted" style={{ fontSize: "0.85rem" }}>No capabilities granted.</span>
                ) : (
                  role.capabilityKeys.map((key) => (
                    <span
                      key={key}
                      className="muted"
                      style={{
                        fontSize: "0.75rem",
                        border: "1px solid var(--border)",
                        borderRadius: "999px",
                        padding: "0.15rem 0.6rem",
                      }}
                    >
                      {key}
                    </span>
                  ))
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
