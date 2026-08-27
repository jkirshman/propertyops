/** Masks all but the first character of the local part, for safe audit logging. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) {
    return "***";
  }

  const visible = local.slice(0, 1);
  const masked = "*".repeat(Math.max(local.length - 1, 1));
  return `${visible}${masked}@${domain}`;
}
