"use client";

import { useState } from "react";

import { PersonAssetsPanel } from "@/components/people/PersonAssetsPanel";

export interface PersonRecord {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  referenceNumber: string | null;
  isActive: boolean;
}

const TABS = ["overview", "assets"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  assets: "Assets",
};

export function PersonDetailPanel({
  person,
  canOnboard,
  canOffboard,
}: {
  person: PersonRecord;
  canOnboard: boolean;
  canOffboard: boolean;
}) {
  const [tab, setTab] = useState<Tab>("assets");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", borderBottom: "1px solid var(--border)" }}>
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            style={{
              padding: "0.6rem 0.9rem",
              background: "none",
              border: "none",
              borderBottom: tab === value ? "2px solid var(--brand)" : "2px solid transparent",
              fontWeight: tab === value ? 600 : 500,
              color: tab === value ? "var(--foreground)" : "var(--muted)",
              cursor: "pointer",
            }}
          >
            {TAB_LABELS[value]}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.9rem" }}>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Email</div>
            <div>{person.email ?? "Not set"}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Phone</div>
            <div>{person.phone ?? "Not set"}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Reference number</div>
            <div>{person.referenceNumber ?? "Not set"}</div>
          </div>
        </div>
      ) : null}

      {tab === "assets" ? (
        <PersonAssetsPanel personId={person.id} canOnboard={canOnboard} canOffboard={canOffboard} />
      ) : null}
    </div>
  );
}
