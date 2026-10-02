import Link from "next/link";

/**
 * NAV-1: icon-only "up one level" arrow beside a detail page's title. Always
 * a real link to an explicit parent route (see lib/navigation/back-links) —
 * never browser history. Usually spread from a BackTarget: <BackLink {...target} />, inside a
 * `.page-title-row` wrapping the <h1>.
 */
export function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="back-link" aria-label={label} title={label}>
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path
          d="M16 10H4M9 5l-5 5 5 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
