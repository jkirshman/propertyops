import { describe, expect, it } from "vitest";

import { buildInvitationEmail, buildPasswordResetEmail } from "./account-emails";
import { escapeHtml, renderTransactionalEmail } from "./transactional-layout";

const TOKEN = "a".repeat(64);
const ACTIVATION_URL = `https://propertyops.lawassetgroup.com/activate?token=${TOKEN}`;
const RESET_URL = `https://propertyops.lawassetgroup.com/reset-password?token=${TOKEN}`;

/** Visible text of the HTML: tags (and so href attributes) stripped. */
function visibleText(html: string): string {
  return html.replace(/<[^>]*>/g, " ");
}

describe("buildInvitationEmail", () => {
  const email = buildInvitationEmail({ activationUrl: ACTIVATION_URL });

  it("uses the invitation subject and the existing tracked kind", () => {
    expect(email.subject).toBe("Set up your PropertyOps account");
    expect(email.kind).toBe("user_invitation");
  });

  it("renders a single CTA link and never shows the token as visible HTML text", () => {
    expect(email.html).toContain(`href="${ACTIVATION_URL}"`);
    expect(email.html.match(/<a /g)).toHaveLength(1);
    expect(visibleText(email.html)).not.toContain(TOKEN);
    expect(email.html).toContain("Set up account");
    expect(email.html).toContain("This link expires in 7 days.");
    expect(email.html).toContain("a PropertyOps administrator created an account for this email address");
  });

  it("has a useful plain-text alternative with the URL, reason, expiry, and ignore guidance", () => {
    expect(email.text).toContain(ACTIVATION_URL);
    expect(email.text).toContain("You've been invited to PropertyOps.");
    expect(email.text).toContain("This link expires in 7 days.");
    expect(email.text).toContain("If you weren't expecting this, you can ignore this message.");
    expect(email.text).not.toMatch(/<[a-z]/i);
  });

  it("has no scripts, images, or tracking pixels", () => {
    expect(email.html).not.toMatch(/<script|<img|<link /i);
  });

  it("resend variant keeps the same subject/kind", () => {
    const resend = buildInvitationEmail({ activationUrl: ACTIVATION_URL, resend: true });
    expect(resend.subject).toBe(email.subject);
    expect(resend.kind).toBe(email.kind);
    expect(resend.text).toContain("new link");
  });
});

describe("buildPasswordResetEmail", () => {
  const email = buildPasswordResetEmail({ resetUrl: RESET_URL, expiresInMinutes: 60 });

  it("uses the reset subject and a distinguishable kind", () => {
    expect(email.subject).toBe("Reset your PropertyOps password");
    expect(email.kind).toBe("password_reset");
  });

  it("renders html and text with CTA, 60-minute expiry, and ignore guidance", () => {
    expect(email.html).toContain(`href="${RESET_URL}"`);
    expect(email.html).toContain("Reset password");
    expect(visibleText(email.html)).not.toContain(TOKEN);
    for (const [body, encode] of [
      [email.html, escapeHtml],
      [email.text, (value: string) => value],
    ] as const) {
      expect(body).toContain(encode("We received a request to reset the password for your PropertyOps account."));
      expect(body).toContain(encode("expires in 60 minutes"));
      expect(body).toContain(encode("If you didn't request a password reset, you can ignore this email."));
    }
    expect(email.text).toContain(RESET_URL);
  });
});

describe("renderTransactionalEmail", () => {
  it("escapes all interpolated content", () => {
    const { html } = renderTransactionalEmail({
      preheader: "<b>",
      heading: "<script>alert(1)</script>",
      paragraphs: ['"quoted" & <tag>'],
      action: { label: "Go", url: 'https://example.com/?a=1&b="x"' },
      expiryNotice: "soon",
      footer: "footer",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain(escapeHtml("<script>alert(1)</script>"));
    expect(html).toContain("&quot;quoted&quot; &amp; &lt;tag&gt;");
    expect(html).toContain('href="https://example.com/?a=1&amp;b=&quot;x&quot;"');
  });
});
