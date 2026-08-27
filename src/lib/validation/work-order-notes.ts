import { z } from "zod";

export const createWorkOrderNoteSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export type CreateWorkOrderNoteInput = z.infer<typeof createWorkOrderNoteSchema>;
