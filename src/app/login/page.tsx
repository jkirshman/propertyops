import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";

import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

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
        <LoginForm />
      </div>
    </div>
  );
}
