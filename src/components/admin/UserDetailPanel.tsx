"use client";

import { useCallback, useEffect, useState } from "react";

interface UserDetail {
  id: string;
  email: string;
  displayName: string;
  roleId: string;
  isActive: boolean;
  isPending: boolean;
}

interface RoleOption {
  id: string;
  name: string;
}

interface PropertyAccessRow {
  id: string;
  propertyId: string;
  propertyName: string;
  propertyUnitId: string | null;
  unitLabel: string | null;
}

interface PropertyOption {
  id: string;
  name: string;
}

interface UnitOption {
  id: string;
  unitLabel: string;
  isActive: boolean;
}

// ACCESS-1: the capability that marks a role as unrestricted (organization-
// wide) Property access — assigning rows below has no effect for a user
// whose role currently holds it (see src/lib/auth/property-access.ts).
const UNRESTRICTED_ACCESS_CAPABILITY = "properties.access.unrestricted";

export function UserDetailPanel({ userId, isSelf }: { userId: string; isSelf: boolean }) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [roleName, setRoleName] = useState<string | null>(null);
  const [capabilityKeys, setCapabilityKeys] = useState<string[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activationUrl, setActivationUrl] = useState<string | null>(null);

  const [propertyAccess, setPropertyAccess] = useState<PropertyAccessRow[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [accessPropertyId, setAccessPropertyId] = useState("");
  const [accessUnitId, setAccessUnitId] = useState("");
  const [accessError, setAccessError] = useState<string | null>(null);
  const [accessBusy, setAccessBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [userResponse, rolesResponse, accessResponse, propertiesResponse] = await Promise.all([
        fetch(`/api/admin/users/${userId}`),
        fetch("/api/roles"),
        fetch(`/api/admin/users/${userId}/property-access`),
        fetch("/api/properties"),
      ]);
      if (userResponse.ok) {
        const data = await userResponse.json();
        setUser(data.user);
        setRoleName(data.roleName);
        setCapabilityKeys(data.capabilityKeys ?? []);
        setSelectedRoleId(data.user.roleId);
      }
      if (rolesResponse.ok) {
        const data = await rolesResponse.json();
        setRoles((data.roles ?? []).map((role: { id: string; name: string }) => ({ id: role.id, name: role.name })));
      }
      if (accessResponse.ok) {
        const data = await accessResponse.json();
        setPropertyAccess(data.access ?? []);
      }
      if (propertiesResponse.ok) {
        const data = await propertiesResponse.json();
        setProperties(
          (data.properties ?? []).map((property: { id: string; name: string }) => ({
            id: property.id,
            name: property.name,
          })),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    const request = accessPropertyId
      ? fetch(`/api/properties/${accessPropertyId}/units`).then((response) => (response.ok ? response.json() : null))
      : Promise.resolve(null);
    request.then((data) => {
      if (!cancelled) setUnits(data?.units ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [accessPropertyId]);

  function handleAccessPropertyChange(propertyId: string) {
    setAccessPropertyId(propertyId);
    setAccessUnitId("");
  }

  async function handleAddAccess() {
    if (!accessPropertyId) return;
    setAccessError(null);
    setAccessBusy(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/property-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: accessPropertyId, propertyUnitId: accessUnitId || null }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setAccessError(
          data?.error === "already_assigned"
            ? "This user already has that access assigned."
            : "Could not assign that access.",
        );
        return;
      }
      setPropertyAccess(data.access ?? []);
      setAccessPropertyId("");
      setAccessUnitId("");
    } catch {
      setAccessError("Could not reach the server.");
    } finally {
      setAccessBusy(false);
    }
  }

  async function handleRemoveAccess(accessId: string) {
    setAccessError(null);
    setAccessBusy(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/property-access/${accessId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setAccessError("Could not remove that access.");
        return;
      }
      setPropertyAccess((current) => current.filter((row) => row.id !== accessId));
    } catch {
      setAccessError("Could not reach the server.");
    } finally {
      setAccessBusy(false);
    }
  }

  const activeUnits = units.filter((unit) => unit.isActive);
  const isUnrestrictedRole = capabilityKeys.includes(UNRESTRICTED_ACCESS_CAPABILITY);

  async function patch(body: Record<string, unknown>) {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(
          data?.error === "last_admin"
            ? "This is the only user who can manage Users & Access — deactivate another administrator first, or promote someone else."
            : data?.error === "invalid_role"
              ? "Choose a valid role."
              : "Could not save this change.",
        );
        return false;
      }
      await load();
      return true;
    } catch {
      setError("Could not reach the server.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleRoleChange() {
    if (!user || selectedRoleId === user.roleId) return;
    await patch({ roleId: selectedRoleId });
  }

  async function handleToggleActive() {
    if (!user) return;
    const ok = await patch({ isActive: !user.isActive });
    if (ok) {
      setNotice(user.isActive ? "User deactivated. Their sessions were signed out." : "User reactivated.");
    }
  }

  async function handleResendActivation() {
    setError(null);
    setNotice(null);
    setActivationUrl(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/resend-activation`, { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError("Could not resend the activation link.");
        return;
      }
      setActivationUrl(data.activationUrl);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevokeSessions() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/revoke-sessions`, { method: "POST" });
      if (!response.ok) {
        setError("Could not sign out this user's sessions.");
        return;
      }
      setNotice("All of this user's sessions were signed out.");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="muted">Loading…</p>;
  }
  if (!user) {
    return <p className="muted">User not found.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error ? <p className="error-text">{error}</p> : null}
      {notice ? <p className="muted">{notice}</p> : null}

      <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.9rem" }}>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Name</div>
          <div>{user.displayName}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Email</div>
          <div>{user.email}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Status</div>
          <div>{!user.isActive ? "Inactive" : user.isPending ? "Pending activation" : "Active"}</div>
        </div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <strong>Role assignment</strong>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 220px" }}>
            <label className="label" htmlFor="role-select">
              Assigned role (currently {roleName ?? "Unknown"})
            </label>
            <select
              id="role-select"
              className="input"
              value={selectedRoleId}
              onChange={(event) => setSelectedRoleId(event.target.value)}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="button button-primary"
            disabled={busy || selectedRoleId === user.roleId}
            onClick={handleRoleChange}
          >
            Save role
          </button>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>
            Effective capabilities from this role (read-only)
          </div>
          {capabilityKeys.length === 0 ? (
            <p className="muted" style={{ fontSize: "0.85rem" }}>This role grants no capabilities.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {capabilityKeys.map((key) => (
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
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <strong>Property access</strong>
        <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>
          Role decides what this person can do; access below decides which Properties (and
          optionally which Unit/Suite) they can do it in.
        </p>
        {isUnrestrictedRole ? (
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            This role has unrestricted access to every property — assigned rows below have no
            effect unless this user is later reassigned to a restricted role.
          </p>
        ) : null}
        {accessError ? <p className="error-text">{accessError}</p> : null}

        {propertyAccess.length === 0 ? (
          <p className="muted" style={{ fontSize: "0.85rem" }}>No properties assigned yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {propertyAccess.map((row) => (
              <div
                key={row.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "0.5rem 0.75rem",
                }}
              >
                <span style={{ fontSize: "0.9rem" }}>
                  {row.propertyName}
                  {row.propertyUnitId ? ` — Unit ${row.unitLabel ?? row.propertyUnitId}` : " — Whole property"}
                </span>
                <button
                  type="button"
                  className="button"
                  disabled={accessBusy}
                  onClick={() => handleRemoveAccess(row.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label className="label" htmlFor="access-property-select">
              Property
            </label>
            <select
              id="access-property-select"
              className="input"
              value={accessPropertyId}
              onChange={(event) => handleAccessPropertyChange(event.target.value)}
            >
              <option value="">Select a property…</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>
          {accessPropertyId && activeUnits.length > 0 ? (
            <div style={{ flex: "1 1 200px" }}>
              <label className="label" htmlFor="access-unit-select">
                Unit / Suite
              </label>
              <select
                id="access-unit-select"
                className="input"
                value={accessUnitId}
                onChange={(event) => setAccessUnitId(event.target.value)}
              >
                <option value="">Whole property</option>
                {activeUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unitLabel}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <button
            type="button"
            className="button button-primary"
            disabled={accessBusy || !accessPropertyId}
            onClick={handleAddAccess}
          >
            Add access
          </button>
        </div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <strong>Account actions</strong>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" className="button" disabled={busy} onClick={handleToggleActive}>
            {user.isActive ? (isSelf ? "Deactivate my account" : "Deactivate") : "Reactivate"}
          </button>
          {user.isPending ? (
            <button type="button" className="button" disabled={busy} onClick={handleResendActivation}>
              Resend activation link
            </button>
          ) : null}
          <button type="button" className="button" disabled={busy} onClick={handleRevokeSessions}>
            Sign out all sessions
          </button>
        </div>
        {activationUrl ? (
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <p className="muted" style={{ fontSize: "0.85rem" }}>
              New activation link (shown once):
            </p>
            <code style={{ wordBreak: "break-all", fontSize: "0.8rem" }}>{activationUrl}</code>
          </div>
        ) : null}
      </div>
    </div>
  );
}
