import { z } from "zod";

import { WORK_ORDER_PRIORITIES, WORK_ORDER_STATUSES } from "@/lib/work-orders/constants";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const createWorkOrderSchema = z.object({
  propertyId: z.string().uuid(),
  categoryId: z.string().uuid(),
  subject: z.string().trim().min(1).max(200),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
  priority: z.enum(WORK_ORDER_PRIORITIES).default("normal"),
  requesterUserId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  assignedUserId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
});

export const updateWorkOrderSchema = z.object({
  subject: z.string().trim().min(1).max(200).optional(),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
  categoryId: z.string().uuid().optional(),
  priority: z.enum(WORK_ORDER_PRIORITIES).optional(),
  status: z.enum(WORK_ORDER_STATUSES).optional(),
  assignedUserId: z.preprocess(emptyToUndefined, z.string().uuid().optional().nullable()),
  resolutionSummary: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
});

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;
export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>;
