import { z } from "zod";

import { INSPECTION_STATUSES } from "@/lib/inspections/constants";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const createInspectionSchema = z.object({
  propertyId: z.string().uuid("Select a property."),
  propertyEquipmentId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  templateId: z.string().uuid("Select an inspection template."),
  scheduledDate: z.preprocess(emptyToUndefined, z.string().regex(DATE_PATTERN, "Enter a valid date.").optional()),
  inspectorUserId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  summary: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
});

export const updateInspectionSchema = z.object({
  propertyEquipmentId: z.preprocess(emptyToUndefined, z.string().uuid().optional().nullable()),
  scheduledDate: z.preprocess(
    emptyToUndefined,
    z.string().regex(DATE_PATTERN, "Enter a valid date.").optional().nullable(),
  ),
  inspectorUserId: z.preprocess(emptyToUndefined, z.string().uuid().optional().nullable()),
  summary: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional().nullable()),
  // Only a transition to 'cancelled' is accepted here — completion has its
  // own dedicated endpoint (validates required items, computes the result).
  status: z.enum(INSPECTION_STATUSES).optional(),
});

export const updateInspectionResponseSchema = z.object({
  value: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional().nullable()),
  outcome: z.preprocess(emptyToUndefined, z.enum(["pass", "fail"]).optional().nullable()),
  note: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional().nullable()),
});

export type CreateInspectionInput = z.infer<typeof createInspectionSchema>;
export type UpdateInspectionInput = z.infer<typeof updateInspectionSchema>;
export type UpdateInspectionResponseInput = z.infer<typeof updateInspectionResponseSchema>;
