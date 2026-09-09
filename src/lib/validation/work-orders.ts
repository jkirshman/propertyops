import { z } from "zod";

import { WORK_ORDER_PRIORITIES, WORK_ORDER_STATUSES } from "@/lib/work-orders/constants";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

/** Shared pure rule: when both are present, the scheduled end must not precede the start. */
function checkScheduleOrdering(
  data: { scheduledStartAt?: string | null; scheduledEndAt?: string | null },
  ctx: z.RefinementCtx,
) {
  if (data.scheduledStartAt && data.scheduledEndAt && data.scheduledEndAt < data.scheduledStartAt) {
    ctx.addIssue({
      code: "custom",
      path: ["scheduledEndAt"],
      message: "Scheduled end must be on or after the scheduled start.",
    });
  }
}

export const createWorkOrderSchema = z
  .object({
    propertyId: z.string().uuid(),
    propertyEquipmentId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    propertyComponentId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    assetId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    categoryId: z.string().uuid(),
    subject: z.string().trim().min(1).max(200),
    description: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
    priority: z.enum(WORK_ORDER_PRIORITIES).default("normal"),
    requesterUserId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    assignedUserId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    vendorId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    scheduledStartAt: z.preprocess(emptyToUndefined, z.string().optional()),
    scheduledEndAt: z.preprocess(emptyToUndefined, z.string().optional()),
  })
  .superRefine(checkScheduleOrdering);

export const updateWorkOrderSchema = z
  .object({
    subject: z.string().trim().min(1).max(200).optional(),
    description: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
    categoryId: z.string().uuid().optional(),
    priority: z.enum(WORK_ORDER_PRIORITIES).optional(),
    status: z.enum(WORK_ORDER_STATUSES).optional(),
    assignedUserId: z.preprocess(emptyToUndefined, z.string().uuid().optional().nullable()),
    propertyEquipmentId: z.preprocess(emptyToUndefined, z.string().uuid().optional().nullable()),
    propertyComponentId: z.preprocess(emptyToUndefined, z.string().uuid().optional().nullable()),
    assetId: z.preprocess(emptyToUndefined, z.string().uuid().optional().nullable()),
    vendorId: z.preprocess(emptyToUndefined, z.string().uuid().optional().nullable()),
    resolutionSummary: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
    scheduledStartAt: z.preprocess(emptyToUndefined, z.string().optional().nullable()),
    scheduledEndAt: z.preprocess(emptyToUndefined, z.string().optional().nullable()),
  })
  .superRefine(checkScheduleOrdering);

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;
export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>;
