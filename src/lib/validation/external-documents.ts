import { z } from "zod";

import { isSafeExternalUrl } from "@/lib/external-documents/url-validation";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const externalUrlSchema = z
  .string()
  .trim()
  .min(1, "Enter a link.")
  .max(2000)
  .refine(isSafeExternalUrl, "Enter a valid https:// link.");

export const createExternalDocumentLinkSchema = z.object({
  relatedEntityType: z.string().trim().min(1).max(100),
  relatedEntityId: z.string().trim().min(1).max(200),
  displayName: z.string().trim().min(1).max(200),
  externalUrl: externalUrlSchema,
  category: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
});

export const updateExternalDocumentLinkSchema = z
  .object({
    displayName: z.string().trim().min(1).max(200).optional(),
    externalUrl: externalUrlSchema.optional(),
    category: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional().nullable()),
    description: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional().nullable()),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.displayName !== undefined ||
      value.externalUrl !== undefined ||
      value.category !== undefined ||
      value.description !== undefined ||
      value.isActive !== undefined,
    { message: "At least one field must be provided." },
  );

export type CreateExternalDocumentLinkInput = z.infer<typeof createExternalDocumentLinkSchema>;
export type UpdateExternalDocumentLinkInput = z.infer<typeof updateExternalDocumentLinkSchema>;
