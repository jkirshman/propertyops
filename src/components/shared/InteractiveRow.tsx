"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties, MouseEvent, ReactNode } from "react";

import { resolveRowClick, ROW_CLICK_INTERACTIVE_SELECTOR } from "@/lib/navigation/row-click";

/**
 * A table row that opens a detail page. The row's primary cell must still
 * render a real link (usually `.entity-link`) to the same `href` — that link
 * is the keyboard/screen-reader path. Clicking elsewhere on the row is a
 * pointer convenience only; nested links/buttons/controls keep their own
 * behavior. Appends a decorative trailing chevron cell, so the table header
 * needs a matching empty `<th aria-hidden="true" />`.
 */
export function InteractiveRow({
  href,
  style,
  children,
}: {
  href: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLTableRowElement>) {
    const target = event.target instanceof Element ? event.target : null;
    const action = resolveRowClick({
      button: event.button,
      defaultPrevented: event.defaultPrevented,
      targetIsInteractive: Boolean(target?.closest(ROW_CLICK_INTERACTIVE_SELECTOR)),
      hasTextSelection: Boolean(window.getSelection()?.toString()),
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
    });
    if (action === "navigate") {
      router.push(href);
    } else if (action === "navigate-new-tab") {
      window.open(href, "_blank", "noopener");
    }
  }

  return (
    <tr className="interactive-row" style={style} onClick={handleClick}>
      {children}
      <td className="row-chevron" aria-hidden="true">
        ›
      </td>
    </tr>
  );
}
