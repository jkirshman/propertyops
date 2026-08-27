"use client";

import { useState } from "react";

export function SendTestEmailButton() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setStatus("sending");
    setMessage(null);
    try {
      const response = await fetch("/api/admin/email/test", { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setStatus("error");
        setMessage("Could not send the test email.");
        return;
      }
      setStatus("done");
      setMessage(
        data?.sent
          ? "Test email sent to your account address."
          : data?.reason === "disabled"
            ? "Email sending is currently disabled (the kill switch is off)."
            : "Email is not fully configured yet.",
      );
    } catch {
      setStatus("error");
      setMessage("Could not reach the server.");
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
        {status === "sending" ? "Sending…" : "Send a test email to yourself"}
      </button>
      {message ? <p className={status === "error" ? "error-text" : "muted"}>{message}</p> : null}
    </div>
  );
}
