import { z } from "zod";

import { PM_INTERVAL_UNITS } from "@/lib/preventive-maintenance/constants";
import { WORK_ORDER_PRIORITIES } from "@/lib/work-orders/constants";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date");

export const createPreventiveMaintenancePlanSchema = z.object({
  propertyId: z.string().uuid(),
  propertyEquipmentId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  instructions: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
  defaultPriority: z.enum(WORK_ORDER_PRIORITIES).default("normal"),
  defaultAssigneeUserId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  intervalUnit: z.enum(PM_INTERVAL_UNITS),
  intervalValue: z.coerce.number().int().min(1).max(60),
  nextDueAt: dateOnly,
});

export const updatePreventiveMaintenancePlanSchema = z.object({
  propertyEquipmentId: z.preprocess(emptyToUndefined, z.string().uuid().optional().nullable()),
  categoryId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200).optional(),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional().nullable()),
  instructions: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional().nullable()),
  defaultPriority: z.enum(WORK_ORDER_PRIORITIES).optional(),
  defaultAssigneeUserId: z.preprocess(emptyToUndefined, z.string().uuid().optional().nullable()),
  intervalUnit: z.enum(PM_INTERVAL_UNITS).optional(),
  intervalValue: z.coerce.number().int().min(1).max(60).optional(),
  nextDueAt: dateOnly.optional(),
  isActive: z.boolean().optional(),
});

export type CreatePreventiveMaintenancePlanInput = z.infer<typeof createPreventiveMaintenancePlanSchema>;
export type UpdatePreventiveMaintenancePlanInput = z.infer<typeof updatePreventiveMaintenancePlanSchema>;
