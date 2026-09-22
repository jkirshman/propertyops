"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { RESET_LINK_INVALID_MESSAGE } from "@/lib/auth/password-reset-messages";
import { VALIDATION_BANNER_MESSAGE, invalidFieldProps, mapFieldErrors } from "@/lib/forms/field-errors";
import { PASSWORD_MIN_LENGTH, resetPasswordSchema } from "@/lib/validation/auth";

const FIELD_MESSAGES: Record<string, string> = {
  password: `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
  confirmPassword: "Passwords do not match.",
};

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [checking, setChecking] = useState(Boolean(token));
  const [invalid, setInvalid] = useState(!token);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    // Drop the token from the visible URL/history once it's in memory.
    window.history.replaceState(null, "", "/reset-password");
    fetch("/api/auth/reset-password/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setInvalid(!data?.valid))
      .catch(() => setInvalid(true))
      .finally(() => setChecking(false));
  }, [token]);

  function showFieldErrors(fields: string[]) {
    setFieldErrors(Object.fromEntries(fields.map((field) => [field, FIELD_MESSAGES[field] ?? ""])));
    setError(VALIDATION_BANNER_MESSAGE);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const parsed = resetPasswordSchema.safeParse({ token, password, confirmPassword });
    if (!parsed.success) {
      showFieldErrors(Object.keys(mapFieldErrors(parsed.error.flatten().fieldErrors)));
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const serverFields = Object.keys(mapFieldErrors(data?.details?.fieldErrors));
        if (data?.error === "invalid_input" && serverFields.length > 0) {
          showFieldErrors(serverFields);
        } else if (data?.error === "invalid_token") {
          setInvalid(true);
        } else {
          setError("Something went wrong. Please try again.");
        }
        return;
      }

      router.push("/login?reset=1");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (checking) {
    return <p className="muted">Checking your reset link…</p>;
  }

  if (invalid || !token) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p className="error-text" role="alert">
          {RESET_LINK_INVALID_MESSAGE}
        </p>
        <Link href="/forgot-password" className="button button-primary" style={{ textAlign: "center" }}>
          Request a new link
        </Link>
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
        <label className="label" htmlFor="password">
          New password
        </label>
        <input
          id="password"
          type="password"
          className="input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          required
          {...invalidFieldProps(Boolean(fieldErrors.password), "password-error")}
        />
        {fieldErrors.password ? (
          <p id="password-error" className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.8rem" }}>
            {fieldErrors.password}
          </p>
        ) : null}
      </div>
      <div>
        <label className="label" htmlFor="confirm-password">
          Confirm password
        </label>
        <input
          id="confirm-password"
          type="password"
          className="input"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          required
          {...invalidFieldProps(Boolean(fieldErrors.confirmPassword), "confirm-password-error")}
        />
        {fieldErrors.confirmPassword ? (
          <p id="confirm-password-error" className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.8rem" }}>
            {fieldErrors.confirmPassword}
          </p>
        ) : null}
      </div>
      <button type="submit" className="button button-primary" disabled={pending}>
        {pending ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}
