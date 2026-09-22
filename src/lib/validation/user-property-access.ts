import { z } from "zod";

export const assignUserPropertyAccessSchema = z.object({
  propertyId: z.string().uuid(),
  // Omitted or null means whole-property access.
  propertyUnitId: z.string().uuid().nullable().optional(),
});

export type AssignUserPropertyAccessInput = z.infer<typeof assignUserPropertyAccessSchema>;
