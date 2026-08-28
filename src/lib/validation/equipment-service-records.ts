import { z } from "zod";

import { EQUIPMENT_SERVICE_TYPES } from "@/lib/equipment/constants";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const createEquipmentServiceRecordSchema = z.object({
  serviceDate: z.string().trim().regex(DATE_PATTERN, "Use YYYY-MM-DD."),
  serviceType: z.enum(EQUIPMENT_SERVICE_TYPES),
  summary: z.string().trim().min(1).max(2000),
  vendorName: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  cost: z.number().min(0).max(10_000_000).optional(),
  meterReading: z.number().int().min(0).optional(),
  performedByUserId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
});

export const updateEquipmentServiceRecordSchema = createEquipmentServiceRecordSchema.partial();

export type CreateEquipmentServiceRecordInput = z.infer<typeof createEquipmentServiceRecordSchema>;
export type UpdateEquipmentServiceRecordInput = z.infer<typeof updateEquipmentServiceRecordSchema>;
