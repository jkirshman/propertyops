/**
 * Prevents an organization from being left with zero users who can manage
 * Users & Access (POLISH-5) — the real lockout risk, since without at least
 * one such user nobody could ever fix access again (not even themselves).
 * `activeUserAdminIds` is every active user in the org whose role currently
 * grants `users.manage`; `targetUserId` is the user about to be deactivated.
 * Pure and DB-independent so it's directly testable.
 */
export function wouldLeaveOrgWithoutUserAdmin(
  activeUserAdminIds: string[],
  targetUserId: string,
): boolean {
  if (!activeUserAdminIds.includes(targetUserId)) {
    return false;
  }
  const remaining = activeUserAdminIds.filter((id) => id !== targetUserId);
  return remaining.length === 0;
}
