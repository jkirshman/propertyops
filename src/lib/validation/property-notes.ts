import { z } from "zod";

export const createPropertyNoteSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export type CreatePropertyNoteInput = z.infer<typeof createPropertyNoteSchema>;
