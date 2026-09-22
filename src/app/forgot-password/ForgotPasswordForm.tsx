"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { FORGOT_PASSWORD_RESPONSE } from "@/lib/auth/password-reset-messages";
import { VALIDATION_BANNER_MESSAGE, invalidFieldProps } from "@/lib/forms/field-errors";
import { forgotPasswordSchema } from "@/lib/validation/auth";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailInvalid, setEmailInvalid] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setEmailInvalid(false);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setEmailInvalid(true);
      setError(VALIDATION_BANNER_MESSAGE);
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (response.status === 400) {
        setEmailInvalid(true);
        setError(VALIDATION_BANNER_MESSAGE);
        return;
      }
      // Any other outcome shows the same generic confirmation: the server
      // never reveals account state, and neither does this page.
      setSubmitted(true);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p className="success-text" role="status">
          {FORGOT_PASSWORD_RESPONSE.message}
        </p>
        <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
          The link expires in 60 minutes. If nothing arrives, check your spam folder or ask an administrator for help.
        </p>
        <p style={{ textAlign: "center", margin: 0 }}>
          <Link href="/login" className="auth-secondary-link">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className="input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          required
          {...invalidFieldProps(emailInvalid)}
        />
      </div>
      <button type="submit" className="button button-primary" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <p style={{ textAlign: "center", margin: 0 }}>
        <Link href="/login" className="auth-secondary-link">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
