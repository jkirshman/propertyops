// AUTH-1: one small, shared layout for account (transactional) emails —
// invitation and password reset. Deliberately conservative email HTML:
// table layout, inline styles only, no images, no external CSS, no scripts,
// no tracking pixels, and exactly one link (the primary action). Every
// render returns a matching plain-text alternative so nothing is HTML-only.

export interface TransactionalEmailContent {
  /** Short inbox-preview line; hidden in the rendered body. */
  preheader: string;
  heading: string;
  paragraphs: string[];
  action: { label: string; url: string };
  /** e.g. "This link expires in 60 minutes." */
  expiryNotice: string;
  /** Why the recipient is getting this, and what to do if it's unexpected. */
  footer: string;
}

export interface RenderedEmail {
  html: string;
  text: string;
}

const BRAND_NAME = "PropertyOps";

// Mirrors the app's brand palette (globals.css) with contrast-safe pairs.
const COLOR = {
  pageBackground: "#f4f5f7",
  surface: "#ffffff",
  border: "#e2e5ea",
  brandBlack: "#14161a",
  brandGold: "#b8860a",
  text: "#171923",
  muted: "#5d6470",
  buttonText: "#ffffff",
} as const;

const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderTransactionalEmail(content: TransactionalEmailContent): RenderedEmail {
  return { html: renderHtml(content), text: renderText(content) };
}

function renderHtml(content: TransactionalEmailContent): string {
  const paragraphs = content.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px 0;font-size:15px;line-height:24px;color:${COLOR.text};">${escapeHtml(paragraph)}</p>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(content.heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLOR.pageBackground};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(content.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLOR.pageBackground};">
<tr>
<td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:${COLOR.surface};border:1px solid ${COLOR.border};border-radius:8px;">
<tr>
<td style="padding:20px 32px;background-color:${COLOR.brandBlack};border-radius:8px 8px 0 0;border-bottom:3px solid ${COLOR.brandGold};font-family:${FONT_STACK};font-size:18px;font-weight:700;letter-spacing:0.3px;color:#ffffff;">${BRAND_NAME}</td>
</tr>
<tr>
<td style="padding:32px 32px 8px 32px;font-family:${FONT_STACK};">
<h1 style="margin:0 0 16px 0;font-size:20px;line-height:28px;font-weight:700;color:${COLOR.text};">${escapeHtml(content.heading)}</h1>
${paragraphs}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px 0;">
<tr>
<td style="border-radius:6px;background-color:${COLOR.brandBlack};">
<a href="${escapeHtml(content.action.url)}" style="display:inline-block;padding:12px 24px;font-family:${FONT_STACK};font-size:15px;font-weight:600;color:${COLOR.buttonText};text-decoration:none;border-radius:6px;">${escapeHtml(content.action.label)}</a>
</td>
</tr>
</table>
<p style="margin:0 0 24px 0;font-size:14px;line-height:22px;color:${COLOR.muted};">${escapeHtml(content.expiryNotice)}</p>
</td>
</tr>
<tr>
<td style="padding:20px 32px 28px 32px;border-top:1px solid ${COLOR.border};font-family:${FONT_STACK};font-size:12px;line-height:18px;color:${COLOR.muted};">${escapeHtml(content.footer)}</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

function renderText(content: TransactionalEmailContent): string {
  return [
    BRAND_NAME,
    "",
    content.heading,
    "",
    ...content.paragraphs.flatMap((paragraph) => [paragraph, ""]),
    `${content.action.label}:`,
    content.action.url,
    "",
    content.expiryNotice,
    "",
    "--",
    content.footer,
    "",
  ].join("\n");
}
