"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { AdminTile } from "@/lib/admin/admin-hub-config";

export function AdminHubGrid({
  tiles,
  groups,
}: {
  tiles: AdminTile[];
  groups: { id: string; title: string }[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return tiles;
    }
    return tiles.filter(
      (tile) =>
        tile.title.toLowerCase().includes(q) || tile.description.toLowerCase().includes(q),
    );
  }, [tiles, query]);

  if (tiles.length === 0) {
    return <p className="muted">No admin tools are available for your role yet.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <input
        className="input"
        style={{ maxWidth: 320 }}
        placeholder="Search admin tools…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {groups.map((group) => {
        const groupTiles = filtered.filter((tile) => tile.group === group.id);
        if (groupTiles.length === 0) {
          return null;
        }
        return (
          <section key={group.id}>
            <h2
              className="muted"
              style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.04em" }}
            >
              {group.title}
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "0.75rem",
                marginTop: "0.6rem",
              }}
            >
              {groupTiles.map((tile) => (
                <Link key={tile.id} href={tile.href} className="card">
                  <div style={{ fontWeight: 600 }}>{tile.title}</div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {tile.description}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
      {filtered.length === 0 ? <p className="muted">No admin tools match your search.</p> : null}
    </div>
  );
}
