# POLISH-6 — PM Duplicate Work Order Protection + Workflow Fixes

## 1. Objective

Protect users from accidentally creating duplicate Preventive Maintenance (PM)
Work Orders while preserving the ability to intentionally create another Work
Order for the same PM item when that is genuinely needed.

## 2. Why This Phase Exists

From a Preventive Maintenance Plan, a user can click "Generate Due Work Order."
Today, nothing stops the same user (or another user) from clicking it again for
the same plan and creating a second Work Order for the same due occurrence,
with no warning. This is unsafe UX for a maintenance operation: duplicate work
orders create duplicate vendor dispatches, duplicate technician visits, and
confusing history. PROP-6 (per its inline schema comments) intended idempotent
PM occurrence handling; this phase must first explain, precisely, why
duplicates are still possible under the current implementation before changing
any behavior.

## 3. Current-State Observations

Grounded in the current implementation (`src/lib/preventive-maintenance/`,
`src/db/schema.ts`):

- `preventive_maintenance_plans` carries one mutable `nextDueAt` (date) per
  plan — the "next occurrence to generate."
- `preventive_maintenance_occurrences` has a **unique index on
  `(planId, dueDate)`** (`pm_occurrences_plan_due_date_unique`). This is the
  actual idempotency guarantee described in the code, but it only prevents two
  occurrences for the *same due date* from both being generated — it does
  nothing once `nextDueAt` has advanced.
- `generatePreventiveMaintenanceOccurrence()`
  (`src/lib/preventive-maintenance/occurrences.ts`) does the following, in
  order, on every manual "Generate" click or cron run:
  1. Insert a row into `preventive_maintenance_occurrences` for
     `(planId, plan.nextDueAt)`, `ON CONFLICT DO NOTHING`.
  2. If the insert was skipped (conflict) and the existing row already has a
     `workOrderId`, return `{ status: "skipped", reason: "already_generated" }`.
  3. Otherwise, create a Work Order via `createWorkOrder(...)`.
  4. Link the occurrence to the new Work Order.
  5. **Advance `plan.nextDueAt`** to the next computed due date
     (`computeNextDueDate`).
- **This is the root cause of the reported duplicate-generation problem**:
  step 5 always advances `nextDueAt`, regardless of whether the Work Order that
  was just generated has since been resolved, closed, or is still open. On the
  very next click of "Generate Due Work Order" (assuming `requireDue` isn't
  gating it, or the new due date is already in the past for an overdue plan),
  the function inserts a **new** occurrence row at the **new** `nextDueAt`
  value and creates a **second** Work Order — this is not a duplicate insert
  conflict at all; it is a second, distinct occurrence, generated for a plan
  whose prior occurrence's Work Order is still open.
- The occurrence/plan model has **no per-plan concept of "is there currently an
  open PM-generated Work Order for this plan."** `mapWorkOrderStatusToOccurrenceStatus`
  (`src/lib/preventive-maintenance/occurrence-status.ts`) classifies a linked
  Work Order's status into `generated` (non-terminal), `completed`
  (`resolved`/`closed`), or `cancelled` — but nothing in
  `generatePreventiveMaintenanceOccurrence` consults this classification before
  creating a new occurrence.
- Work Order statuses (`src/lib/work-orders/constants.ts`,
  `WORK_ORDER_STATUSES`): `new`, `open`, `in_progress`, `waiting` (non-terminal)
  and `resolved`, `closed`, `cancelled` (terminal). This is the existing status
  vocabulary this phase must reuse — no new status values.
- There is no UI code found for a "Generate Due Work Order" button guard or
  confirmation step; the gap is server-side and (by extension) UI-side.
- `PREVENTIVE_MAINTENANCE_CAPABILITIES.GENERATE` (`preventive_maintenance.generate`)
  already exists and already gates who may call generation at all.

**Conclusion**: the duplicate-prevention gap is not "the unique index doesn't
work" — it works correctly for its narrow purpose (never generate two
occurrences for the identical due date). The gap is that **advancing
`nextDueAt` is not conditioned on the prior occurrence's Work Order being
resolved**, so repeated manual generation (or, in principle, an overdue plan
combined with a delayed technician visit) can create a new occurrence, and
therefore a new Work Order, while the previous one is still open.

## 4. Required Behavior

When a user attempts to generate a Work Order for a PM plan that **already has
a relevant open, non-terminal PM-generated Work Order**:

1. **Warn clearly, before creating anything:**
   > "An open Preventive Maintenance Work Order already exists for this item."
2. **Show context** in the warning: Work Order number (`workOrders.number`),
   status (`WORK_ORDER_STATUS_LABELS[status]`), Property name, and Equipment
   display name where the plan is linked to `propertyEquipmentId`.
3. **Primary action**: "Open Existing Work Order" — navigates to
   `/work-orders/[id]` for the open Work Order. No new record is created.
4. **Secondary, intentional action**: "Generate Another Work Order." Selecting
   it requires an explicit confirmation step:
   > "Are you sure? This will create an additional Work Order for the same
   > Preventive Maintenance item."
5. Only after that second confirmation does the system proceed to generate a
   new Work Order. Intentional duplication remains fully possible — this is a
   warn-and-confirm gate, not a hard block.
6. The system must **never silently create a duplicate** — every path that
   reaches Work Order creation from a PM plan has either confirmed no open
   Work Order exists, or received the explicit "Generate Another" confirmation.

### Definition of "an existing open Work Order"

For a given `preventive_maintenance_plans.id`, an **open PM-generated Work
Order** is any `work_orders` row such that:

- It is linked via a `preventive_maintenance_occurrences` row where
  `occurrence.planId = plan.id` and `occurrence.workOrderId` is not null, **and**
- The linked Work Order's `status` is one of the non-terminal statuses:
  `new`, `open`, `in_progress`, `waiting`.

Equivalently: `occurrence.status = 'generated'` under
`mapWorkOrderStatusToOccurrenceStatus` (the existing occurrence-status
classification already treats `resolved`/`closed` as `completed` and
`cancelled` as `cancelled` — both terminal for this purpose). A plan may have
multiple historical occurrences; only the **most recent occurrence whose
Work Order is still non-terminal**, if any, counts as blocking.

A **closed, resolved, or cancelled** historical occurrence must never
permanently block a future legitimate PM occurrence — once the open Work
Order is resolved/closed/cancelled, the next "Generate" click proceeds without
any warning.

### Behavior change to `generatePreventiveMaintenanceOccurrence`

The manual-generation call path (invoked from the "Generate Due Work Order"
UI action) must, before inserting a new occurrence:

1. Query for the plan's most recent occurrence with a non-null `workOrderId`.
2. Join to that Work Order's current `status`.
3. If that status is non-terminal, return a new result variant (e.g.
   `{ status: "blocked", openWorkOrder: {...} }`) instead of proceeding,
   **unless** the caller has passed an explicit "confirm duplicate" flag (set
   only by the "Generate Another Work Order" confirmed action).
4. The **cron-driven** call path (`src/app/api/cron/preventive-maintenance`)
   must **not** be blocked by this check in the same way — it should be
   updated to skip generation (log/no-op) for a plan with an open PM Work
   Order rather than surface a UI warning, since there is no user present to
   confirm. Document this as a required change to the cron route to avoid the
   cron itself becoming a silent-duplicate source.

## 5. Data/Model Implications

No new tables are required. This phase is a service-logic and query change:

- `generatePreventiveMaintenanceOccurrence` gains a pre-check query and a new
  `options.confirmDuplicate?: boolean` parameter.
- A new lookup function, e.g. `getOpenPmWorkOrderForPlan(organizationId, planId)`,
  in `src/lib/preventive-maintenance/occurrences.ts`, returning the most recent
  occurrence's linked Work Order when non-terminal, or `null`.
- No schema/migration changes are anticipated. If implementation discovers a
  genuine need for an indexed lookup (e.g. a composite index on
  `preventive_maintenance_occurrences (planId, workOrderId)` for query
  performance), that is an additive index migration, not a data-shape change.

## 6. UI/UX Expectations

- The warning and confirmation are modal/dialog-based, consistent with
  existing confirmation patterns already used for destructive/consequential
  actions in the app (existing UI convention — implementation should locate
  and match the nearest existing confirm-dialog pattern rather than inventing
  a new one).
- The warning dialog must show, at minimum: Work Order number, status label,
  Property name, Equipment display name (if applicable) — as plain text, not
  raw internal identifiers.
- "Open Existing Work Order" is visually primary (e.g. default button);
  "Generate Another Work Order" is visually secondary.
- The second confirmation (for intentional duplication) is a distinct step,
  not a checkbox on the same dialog — it must require its own explicit
  affirmative action.

## 7. Authorization/Capability Considerations

- No new capability is required. `PREVENTIVE_MAINTENANCE_CAPABILITIES.GENERATE`
  continues to gate the entire generate action, both the blocked-path and the
  confirmed-duplicate path.
- The "Open Existing Work Order" link must still respect
  `WORK_ORDER_CAPABILITIES.VIEW` for the user — if a user can generate PM Work
  Orders but cannot view Work Orders directly (an unusual but not impossible
  role configuration), the link should degrade to showing the Work Order
  number/status as text without a navigable link, rather than erroring.

## 8. Notifications/Email Considerations

No new notification types are introduced. Existing PM notification events
(`buildPmWorkOrderGeneratedNotification`, `buildPmWorkOrderCompletedNotification`
in `src/lib/preventive-maintenance/notification-events.ts`) continue to fire
exactly as today, only for occurrences that actually reach Work Order creation
(i.e., not for the blocked path, since no occurrence/Work Order is created
there).

## 9. Audit Requirements

- The existing audit event `preventive_maintenance_plan.occurrence_generated`
  continues to fire on every successful generation (first-time or confirmed
  duplicate). Its `after` payload must additionally record
  `duplicateConfirmed: boolean` so the audit trail distinguishes a normal
  generation from an intentional duplicate.
- A new audit event, `preventive_maintenance_plan.occurrence_generation_blocked`,
  should be recorded when generation is blocked by an open Work Order, with
  `after` containing the blocking Work Order's id/number/status. This gives
  operators a record of near-miss duplicate attempts even when no new Work
  Order was created.

## 10. Migration Considerations

None anticipated for the schema. If a supporting index is added (Section 5),
it is a single additive Drizzle migration with no data backfill required.

## 11. Backward Compatibility

- All existing `preventive_maintenance_occurrences` and `work_orders` rows are
  read, never rewritten, by the new open-Work-Order check.
- Plans with no occurrence history behave exactly as today (nothing to block
  on).
- The manual generation function's existing return variants
  (`generated` / `skipped: inactive|not_due|already_generated`) remain
  unchanged; `blocked` is a new, additive variant. Any caller that only
  handles the old variants and ignores unrecognized ones must be checked
  during implementation so it fails safely (does not silently treat `blocked`
  as `generated`).

## 12. Explicit Out-of-Scope Items

- Any change to the PM recurrence/interval model (`computeNextDueDate`,
  `intervalUnit`/`intervalValue`).
- Any change to Work Order status transition rules
  (`computeStatusTimestampUpdates`) — POLISH-6 only reads status, it does not
  restrict transitions.
- Any workflow-designer or configurable-transition-graph feature.
- Any small workflow defect **not explicitly listed here**. This document may
  become a holding area for additional small, real-world-discovered workflow
  fixes, but each such fix must be added to this document (with its own
  Required Behavior / Acceptance Criteria) before implementation — POLISH-6
  must not become an unlimited cleanup ticket.

## 13. Dependencies

None. This phase is self-contained within the existing Preventive Maintenance
and Work Orders modules.

## 14. Acceptance Criteria

- Clicking "Generate Due Work Order" for a plan with **no** prior occurrence
  generates a Work Order exactly as today.
- Clicking it again while the generated Work Order is still non-terminal
  (`new`/`open`/`in_progress`/`waiting`) shows the warning dialog with the
  correct Work Order number, status, Property, and Equipment context, and
  creates **no** new occurrence or Work Order unless the user explicitly
  confirms "Generate Another Work Order."
- Confirming "Generate Another Work Order" creates a second, distinct
  occurrence and Work Order, both correctly linked to the same PM plan
  (`source = preventive_maintenance` on the new Work Order), and records
  `duplicateConfirmed: true` in the audit event.
- Once the open Work Order is moved to `resolved`, `closed`, or `cancelled`,
  the next "Generate Due Work Order" click proceeds with **no** warning.
- The cron route (`api/cron/preventive-maintenance`) never creates a second
  Work Order for a plan that already has an open PM Work Order; it logs a
  skip instead.
- Concurrent/double-submit: two near-simultaneous manual "Generate" clicks for
  the same plan and same due date still result in at most one Work Order for
  that due date (relying on the existing `pm_occurrences_plan_due_date_unique`
  index) — this phase must not regress that existing guarantee.

## 15. Manual Verification Checklist

1. Create a PM plan; click "Generate Due Work Order" — confirm one Work Order
   is created, linked, and notified as today.
2. Click "Generate Due Work Order" again immediately — confirm the warning
   dialog appears with correct Work Order/Property/Equipment details, and no
   new record is created.
3. Click "Open Existing Work Order" from the warning — confirm it navigates to
   the correct Work Order.
4. Repeat step 2, this time choosing "Generate Another Work Order," confirm
   the second confirmation prompt, and confirm — verify a second Work Order
   and occurrence are created, and the audit log shows
   `duplicateConfirmed: true`.
5. Resolve or close the first Work Order, then click "Generate Due Work Order"
   again (once the plan's `nextDueAt` is due) — confirm no warning appears and
   generation proceeds normally.
6. Cancel an open PM-generated Work Order directly, then attempt generation —
   confirm no warning appears (cancelled is terminal) and generation proceeds.
7. Run the PM cron against a plan with an open PM Work Order — confirm no
   second Work Order is created and the skip is logged/auditable.
8. Confirm a user with `preventive_maintenance.generate` but without
   `work_order.view` sees the warning dialog with non-navigable Work Order
   context instead of a broken link.

## 16. Open Questions

- Should the "blocked" audit event
  (`preventive_maintenance_plan.occurrence_generation_blocked`) be visible
  anywhere in the UI (e.g., on the plan's activity/history panel), or purely a
  backend audit record for this phase? This affects UI scope slightly but not
  the underlying model; implementation should default to backend-only unless
  the plan's existing activity panel already surfaces non-mutating audit
  events, in which case reuse that surface.
