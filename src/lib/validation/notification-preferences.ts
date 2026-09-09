import { z } from "zod";

export const updateNotificationPreferenceSchema = z
  .object({
    inAppEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
  })
  .refine((value) => value.inAppEnabled !== undefined || value.emailEnabled !== undefined, {
    message: "At least one of inAppEnabled or emailEnabled must be provided.",
  });

export type UpdateNotificationPreferenceInput = z.infer<typeof updateNotificationPreferenceSchema>;
