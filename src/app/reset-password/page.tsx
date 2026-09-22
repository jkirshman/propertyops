import type { Metadata } from "next";

import { ResetPasswordForm } from "./ResetPasswordForm";

// The raw token is in this page's URL; never let it leak to another origin
// via the Referer header.
export const metadata: Metadata = {
  title: "Reset password · PropertyOps Hub",
  referrer: "no-referrer",
};

// Not redirected when signed in: a user following an emailed link should be
// able to finish the reset regardless, and completion revokes every session.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="login-page">
      <div className="login-card card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div>
          <h1 className="sr-only">Reset your PropertyOps password</h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/propertyops-logo.png" alt="PropertyOps Hub" className="login-logo" />
          <p className="muted" style={{ textAlign: "center", marginTop: "0.75rem" }}>
            Choose a new password.
          </p>
        </div>
        <ResetPasswordForm token={token ?? null} />
      </div>
    </div>
  );
}
