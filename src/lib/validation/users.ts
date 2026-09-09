import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  displayName: z.string().trim().min(1).max(200),
  roleId: z.string().uuid(),
});

export const updateUserSchema = z
  .object({
    displayName: z.string().trim().min(1).max(200).optional(),
    roleId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) => value.displayName !== undefined || value.roleId !== undefined || value.isActive !== undefined,
    { message: "At least one field must be provided." },
  );

export const activateAccountSchema = z.object({
  token: z.string().trim().min(20).max(200),
  password: z.string().min(8).max(200),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ActivateAccountInput = z.infer<typeof activateAccountSchema>;
