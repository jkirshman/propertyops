"use client";

import { useEffect, useState } from "react";

import { NOTIFICATION_CATEGORY_LABELS, type NotificationCategory } from "@/lib/notifications/categories";

interface PreferenceRow {
  category: NotificationCategory;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  appBriefEnabled: boolean;
}

export function NotificationPreferencesPanel() {
  const [preferences, setPreferences] = useState<PreferenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState<NotificationCategory | null>(null);

  useEffect(() => {
    fetch("/api/notification-preferences")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setPreferences(data.preferences);
      })
      .finally(() => setLoading(false));
  }, []);

  async function toggle(category: NotificationCategory, field: "inAppEnabled" | "emailEnabled" | "appBriefEnabled") {
    const current = preferences.find((p) => p.category === category);
    if (!current) return;

    setError(null);
    setSavingCategory(category);
    const nextValue = !current[field];

    const response = await fetch(`/api/notification-preferences/${category}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: nextValue }),
    });
    setSavingCategory(null);

    if (!response.ok) {
      setError("Could not update this preference. Please try again.");
      return;
    }

    const data = await response.json();
    setPreferences((prev) => prev.map((p) => (p.category === category ? data.preference : p)));
  }

  if (loading) {
    return <p className="muted">Loading notification preferences…</p>;
  }

  return (
    <div>
      {error ? <p className="error-text">{error}</p> : null}
      <p className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.5rem" }}>
        In-App and Email control notification delivery. App Brief controls whether the category appears on Home —
        turning it off never affects your notifications.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "420px" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: "0.5rem 0" }}>Category</th>
              <th style={{ padding: "0.5rem 0", textAlign: "center" }}>In-App</th>
              <th style={{ padding: "0.5rem 0", textAlign: "center" }}>Email</th>
              <th style={{ padding: "0.5rem 0", textAlign: "center" }}>App Brief</th>
            </tr>
          </thead>
          <tbody>
            {preferences.map((preference) => (
              <tr key={preference.category} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "0.5rem 0" }}>{NOTIFICATION_CATEGORY_LABELS[preference.category]}</td>
                <td style={{ padding: "0.5rem 0", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={preference.inAppEnabled}
                    disabled={savingCategory === preference.category}
                    onChange={() => toggle(preference.category, "inAppEnabled")}
                    aria-label={`${NOTIFICATION_CATEGORY_LABELS[preference.category]} in-app notifications`}
                  />
                </td>
                <td style={{ padding: "0.5rem 0", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={preference.emailEnabled}
                    disabled={savingCategory === preference.category}
                    onChange={() => toggle(preference.category, "emailEnabled")}
                    aria-label={`${NOTIFICATION_CATEGORY_LABELS[preference.category]} email notifications`}
                  />
                </td>
                <td style={{ padding: "0.5rem 0", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={preference.appBriefEnabled}
                    disabled={savingCategory === preference.category}
                    onChange={() => toggle(preference.category, "appBriefEnabled")}
                    aria-label={`${NOTIFICATION_CATEGORY_LABELS[preference.category]} App Brief visibility on Home`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
