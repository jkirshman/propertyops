"use client";

import { useState } from "react";

export function SendTestNotificationButton() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleClick() {
    setStatus("sending");
    try {
      const response = await fetch("/api/admin/notifications/test", { method: "POST" });
      setStatus(response.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-start" }}>
      <button
        type="button"
        className="button button-primary"
        onClick={handleClick}
        disabled={status === "sending"}
      >
        {status === "sending" ? "Sending…" : "Send yourself a test notification"}
      </button>
      {status === "sent" ? <p className="muted">Sent — check the bell icon.</p> : null}
      {status === "error" ? (
        <p className="error-text">Could not send the test notification.</p>
      ) : null}
    </div>
  );
}
