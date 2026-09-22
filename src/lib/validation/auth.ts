import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;

// AUTH-1 password reset. Password rules intentionally match loginSchema /
// activateAccountSchema (8–200 chars) — one password policy everywhere.
export const PASSWORD_MIN_LENGTH = 8;
const passwordField = z.string().min(PASSWORD_MIN_LENGTH).max(200);

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
});

export const resetPasswordTokenSchema = z.object({
  token: z.string().trim().min(20).max(200),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(20).max(200),
    password: passwordField,
    confirmPassword: z.string().max(200),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
