"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

export function ActivateForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [checking, setChecking] = useState(Boolean(token));
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(!token);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    fetch(`/api/auth/activate?token=${encodeURIComponent(token)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.displayName) {
          setDisplayName(data.displayName);
        } else {
          setInvalid(true);
        }
      })
      .catch(() => setInvalid(true))
      .finally(() => setChecking(false));
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        setError("This activation link is invalid or has expired. Ask an administrator to resend it.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (checking) {
    return <p className="muted">Checking your activation link…</p>;
  }

  if (invalid || !token) {
    return (
      <p className="error-text">This activation link is invalid or has expired. Ask an administrator to resend it.</p>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error ? <p className="error-text">{error}</p> : null}
      {displayName ? <p className="muted">Welcome, {displayName}. Choose a password to finish setting up your account.</p> : null}
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          className="input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          aria-invalid={error ? true : undefined}
          required
        />
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
          aria-invalid={error ? true : undefined}
          required
        />
      </div>
      <button type="submit" className="button button-primary" disabled={pending}>
        {pending ? "Setting up…" : "Set up account"}
      </button>
    </form>
  );
}
