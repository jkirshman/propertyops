import { z } from "zod";

import { LEASE_STATUSES, LEASE_TYPES, RENT_FREQUENCIES } from "@/lib/leases/constants";
import { getLeaseDateOrderingIssues } from "@/lib/leases/date-ordering";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = "Enter a valid date.";
const dateOnly = z.preprocess(emptyToUndefined, z.string().regex(DATE_PATTERN, DATE_MESSAGE).optional());
const nullableDateOnly = z.preprocess(
  emptyToUndefined,
  z.string().regex(DATE_PATTERN, DATE_MESSAGE).optional().nullable(),
);

const MAX_MONEY = 100_000_000;
const money = z.preprocess(
  emptyToUndefined,
  z.number({ error: "Enter a valid amount." }).min(0, "Amount cannot be negative.").max(MAX_MONEY).optional(),
);
const nullableMoney = z.preprocess(
  emptyToUndefined,
  z
    .number({ error: "Enter a valid amount." })
    .min(0, "Amount cannot be negative.")
    .max(MAX_MONEY)
    .optional()
    .nullable(),
);

/** Runs the shared pure date-ordering rules and reports any issues via Zod's ctx. */
function checkDateOrdering<
  T extends {
    startDate?: string;
    endDate?: string | null;
    moveInDate?: string | null;
    moveOutDate?: string | null;
  },
>(data: T, ctx: z.RefinementCtx) {
  for (const issue of getLeaseDateOrderingIssues(data)) {
    ctx.addIssue({ code: "custom", path: [issue.field], message: issue.message });
  }
}

export const createLeaseSchema = z
  .object({
    propertyId: z.string().uuid("Select a property."),
    tenantId: z.string().uuid("Select a tenant."),
    label: z.string({ error: "Lease label is required." }).trim().min(1, "Lease label is required.").max(200),
    leaseType: z.enum(LEASE_TYPES).default("residential"),
    status: z.enum(LEASE_STATUSES).default("draft"),
    startDate: z.string({ error: "Start date is required." }).regex(DATE_PATTERN, DATE_MESSAGE),
    endDate: dateOnly,
    noticeDate: dateOnly,
    renewalOptionDate: dateOnly,
    moveInDate: dateOnly,
    moveOutDate: dateOnly,
    securityDeposit: money,
    baseRent: money,
    rentFrequency: z.preprocess(emptyToUndefined, z.enum(RENT_FREQUENCIES).optional()),
    squareFootageLeased: z.preprocess(
      emptyToUndefined,
      z.number().int().min(0).max(10_000_000).optional(),
    ),
    unitLabel: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
    notes: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
  })
  .superRefine(checkDateOrdering);

export const updateLeaseSchema = z
  .object({
    label: z.string({ error: "Lease label is required." }).trim().min(1, "Lease label is required.").max(200).optional(),
    leaseType: z.enum(LEASE_TYPES).optional(),
    status: z.enum(LEASE_STATUSES).optional(),
    startDate: z.string().regex(DATE_PATTERN, DATE_MESSAGE).optional(),
    endDate: nullableDateOnly,
    noticeDate: nullableDateOnly,
    renewalOptionDate: nullableDateOnly,
    moveInDate: nullableDateOnly,
    moveOutDate: nullableDateOnly,
    securityDeposit: nullableMoney,
    baseRent: nullableMoney,
    rentFrequency: z.preprocess(emptyToUndefined, z.enum(RENT_FREQUENCIES).optional().nullable()),
    squareFootageLeased: z.preprocess(
      emptyToUndefined,
      z.number().int().min(0).max(10_000_000).optional().nullable(),
    ),
    unitLabel: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional().nullable()),
    notes: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional().nullable()),
  })
  .superRefine((data, ctx) =>
    checkDateOrdering(
      {
        startDate: data.startDate,
        endDate: data.endDate ?? undefined,
        moveInDate: data.moveInDate ?? undefined,
        moveOutDate: data.moveOutDate ?? undefined,
      },
      ctx,
    ),
  );

export type CreateLeaseInput = z.infer<typeof createLeaseSchema>;
export type UpdateLeaseInput = z.infer<typeof updateLeaseSchema>;
