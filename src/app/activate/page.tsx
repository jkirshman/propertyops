import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";

import { ActivateForm } from "./ActivateForm";

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  const { token } = await searchParams;

  return (
    <div className="login-page">
      <div className="login-card card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div>
          <h1 className="sr-only">PropertyOps Hub</h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/propertyops-logo.png" alt="PropertyOps Hub" className="login-logo" />
          <p className="muted" style={{ textAlign: "center", marginTop: "0.75rem" }}>
            Set up your account.
          </p>
        </div>
        <ActivateForm token={token ?? null} />
      </div>
    </div>
  );
}
