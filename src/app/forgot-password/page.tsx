import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";

import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return (
    <div className="login-page">
      <div className="login-card card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div>
          <h1 className="sr-only">Reset your PropertyOps password</h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/propertyops-logo.png" alt="PropertyOps Hub" className="login-logo" />
          <p className="muted" style={{ textAlign: "center", marginTop: "0.75rem" }}>
            Enter your account email and we&apos;ll send a link to reset your password.
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
