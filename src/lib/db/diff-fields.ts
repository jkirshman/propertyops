/**
 * Reduces a before/after row pair down to only the fields that actually
 * changed, for compact audit_log before/after payloads. Returns null when
 * nothing in `after` differs from `before`.
 */
export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
): { before: Partial<T>; after: Partial<T> } | null {
  const changedBefore: Partial<T> = {};
  const changedAfter: Partial<T> = {};
  let changed = false;

  for (const key of Object.keys(after) as (keyof T)[]) {
    if (after[key] === undefined) {
      continue;
    }
    if (before[key] !== after[key]) {
      changed = true;
      changedBefore[key] = before[key];
      changedAfter[key] = after[key];
    }
  }

  return changed ? { before: changedBefore, after: changedAfter } : null;
}
