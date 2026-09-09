import { z } from "zod";

export const updateNotificationPreferenceSchema = z
  .object({
    inAppEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    appBriefEnabled: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.inAppEnabled !== undefined || value.emailEnabled !== undefined || value.appBriefEnabled !== undefined,
    {
      message: "At least one of inAppEnabled, emailEnabled, or appBriefEnabled must be provided.",
    },
  );

export type UpdateNotificationPreferenceInput = z.infer<typeof updateNotificationPreferenceSchema>;
