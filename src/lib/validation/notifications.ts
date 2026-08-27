import { z } from "zod";

export const createNotificationSchema = z.object({
  organizationId: z.string().uuid(),
  recipientUserId: z.string().uuid(),
  actorUserId: z.string().uuid().optional(),
  type: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(5000).optional(),
  relatedEntityType: z.string().max(100).optional(),
  relatedEntityId: z.string().max(200).optional(),
  deepLinkUrl: z.string().max(2000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  dedupeKey: z.string().max(200).optional(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
