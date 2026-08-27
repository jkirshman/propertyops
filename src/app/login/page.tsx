import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";

import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return (
    <div className="container" style={{ maxWidth: 420, paddingTop: "4rem" }}>
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div>
          <h1 style={{ fontSize: "1.4rem" }}>PropertyOps Hub</h1>
          <p className="muted">Sign in to continue.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
