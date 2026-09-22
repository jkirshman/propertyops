import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";

import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  const { reset } = await searchParams;

  return (
    <div className="login-page">
      <div className="login-card card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div>
          <h1 className="sr-only">PropertyOps Hub</h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/propertyops-logo.png" alt="PropertyOps Hub" className="login-logo" />
          <p className="muted" style={{ textAlign: "center", marginTop: "0.75rem" }}>
            Sign in to continue.
          </p>
        </div>
        {reset === "1" ? (
          <p className="success-text" role="status">
            Your password has been reset. Sign in with your new password.
          </p>
        ) : null}
        <LoginForm />
        <p style={{ textAlign: "center", margin: 0 }}>
          <Link href="/forgot-password" className="auth-secondary-link">
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  );
}
