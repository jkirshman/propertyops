import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const OPERATIONAL_EVENT_STATUSES = ["active", "cancelled"] as const;

/** Shared pure rule: when both are present, the end must not precede the start. */
function checkDateOrdering(
  data: { startAt?: string; endAt?: string | null },
  ctx: z.RefinementCtx,
) {
  if (data.startAt && data.endAt && data.endAt < data.startAt) {
    ctx.addIssue({
      code: "custom",
      path: ["endAt"],
      message: "End must be on or after the start.",
    });
  }
}

export const createOperationalEventSchema = z
  .object({
    propertyId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    title: z.string({ error: "Title is required." }).trim().min(1, "Title is required.").max(200),
    description: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
    startAt: z.string({ error: "Start is required." }).min(1, "Start is required."),
    endAt: z.preprocess(emptyToUndefined, z.string().optional()),
    allDay: z.boolean().default(false),
  })
  .superRefine(checkDateOrdering);

export const updateOperationalEventSchema = z
  .object({
    propertyId: z.preprocess(emptyToUndefined, z.string().uuid().optional().nullable()),
    title: z.string().trim().min(1, "Title is required.").max(200).optional(),
    description: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional().nullable()),
    startAt: z.string().min(1).optional(),
    endAt: z.preprocess(emptyToUndefined, z.string().optional().nullable()),
    allDay: z.boolean().optional(),
    status: z.enum(OPERATIONAL_EVENT_STATUSES).optional(),
  })
  .superRefine((data, ctx) =>
    checkDateOrdering({ startAt: data.startAt, endAt: data.endAt ?? undefined }, ctx),
  );

export type CreateOperationalEventInput = z.infer<typeof createOperationalEventSchema>;
export type UpdateOperationalEventInput = z.infer<typeof updateOperationalEventSchema>;
