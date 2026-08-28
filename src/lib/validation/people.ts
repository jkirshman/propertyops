import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const createPersonSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  email: z.preprocess(emptyToUndefined, z.string().trim().toLowerCase().email().max(200).optional()),
  phone: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  referenceNumber: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
  linkedUserId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
});

export const updatePersonSchema = z.object({
  firstName: z.string().trim().min(1).max(120).optional(),
  lastName: z.string().trim().min(1).max(120).optional(),
  email: z.preprocess(emptyToUndefined, z.string().trim().toLowerCase().email().max(200).optional()),
  phone: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  referenceNumber: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
  linkedUserId: z.preprocess(emptyToUndefined, z.string().uuid().optional().nullable()),
  isActive: z.boolean().optional(),
});

export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;
