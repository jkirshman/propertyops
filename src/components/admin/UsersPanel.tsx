"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

interface UserRow {
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

export function UsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastActivationUrl, setLastActivationUrl] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("isActive", statusFilter === "active" ? "true" : "false");

      const [usersResponse, rolesResponse] = await Promise.all([
        fetch(`/api/admin/users?${params.toString()}`),
        fetch("/api/roles"),
      ]);
      if (usersResponse.ok) {
        const data = await usersResponse.json();
        setUsers(data.users ?? []);
      }
      if (rolesResponse.ok) {
        const data = await rolesResponse.json();
        setRoles((data.roles ?? []).map((role: { id: string; name: string }) => ({ id: role.id, name: role.name })));
      }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLastActivationUrl(null);
    setCopyStatus(null);

    if (!email.trim() || !displayName.trim() || !roleId) {
      setError("Enter an email, name, and role.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), displayName: displayName.trim(), roleId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(
          data?.error === "email_in_use"
            ? "That email is already in use."
            : data?.error === "invalid_role"
              ? "Choose a valid role."
              : "Could not invite this user. Please try again.",
        );
        return;
      }
      setEmail("");
      setDisplayName("");
      setRoleId("");
      setLastActivationUrl(data.activationUrl);
      await load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyActivationLink() {
    if (!lastActivationUrl) return;
    try {
      const absolute = lastActivationUrl.startsWith("http")
        ? lastActivationUrl
        : `${window.location.origin}${lastActivationUrl}`;
      await navigator.clipboard.writeText(absolute);
      setCopyStatus("Copied.");
    } catch {
      setCopyStatus("Could not copy automatically — select and copy the link above.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <form
        onSubmit={handleInvite}
        className="card"
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
      >
        <strong>Invite a user</strong>
        {error ? <p className="error-text">{error}</p> : null}
        {lastActivationUrl ? (
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <p className="muted" style={{ fontSize: "0.85rem" }}>
              This activation link is shown once. Copy it now if email delivery isn&apos;t enabled or doesn&apos;t reach them.
            </p>
            <code style={{ wordBreak: "break-all", fontSize: "0.8rem" }}>{lastActivationUrl}</code>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button type="button" className="button" onClick={copyActivationLink}>
                Copy link
              </button>
              {copyStatus ? <span className="muted" style={{ fontSize: "0.8rem" }}>{copyStatus}</span> : null}
            </div>
          </div>
        ) : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label className="label" htmlFor="invite-email">
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              className="input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={error ? true : undefined}
            />
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label className="label" htmlFor="invite-name">
              Name
            </label>
            <input
              id="invite-name"
              className="input"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              aria-invalid={error ? true : undefined}
            />
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label className="label" htmlFor="invite-role">
              Role
            </label>
            <select
              id="invite-role"
              className="input"
              value={roleId}
              onChange={(event) => setRoleId(event.target.value)}
              aria-invalid={error ? true : undefined}
            >
              <option value="">Select a role…</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" className="button button-primary" disabled={submitting} style={{ alignSelf: "flex-start" }}>
          {submitting ? "Inviting…" : "Invite user"}
        </button>
      </form>

      <div className="card" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 220px" }}>
          <label className="label" htmlFor="user-search">
            Search
          </label>
          <input
            id="user-search"
            className="input"
            placeholder="Name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="user-status-filter">
            Status
          </label>
          <select
            id="user-status-filter"
            className="input"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : users.length === 0 ? (
          <p className="muted">No users match this filter.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "480px" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "0.5rem 0" }}>Name</th>
                  <th style={{ padding: "0.5rem 0" }}>Email</th>
                  <th style={{ padding: "0.5rem 0" }}>Role</th>
                  <th style={{ padding: "0.5rem 0" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.5rem 0" }}>
                      <Link href={`/admin/users/${user.id}`}>{user.displayName}</Link>
                    </td>
                    <td style={{ padding: "0.5rem 0" }}>{user.email}</td>
                    <td style={{ padding: "0.5rem 0" }}>
                      {roles.find((role) => role.id === user.roleId)?.name ?? "—"}
                    </td>
                    <td style={{ padding: "0.5rem 0" }}>
                      {!user.isActive ? "Inactive" : user.isPending ? "Pending activation" : "Active"}
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
