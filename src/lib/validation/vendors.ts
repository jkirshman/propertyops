import { z } from "zod";

import { VENDOR_COVERAGE_MODES } from "@/lib/vendors/constants";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = "Enter a valid date.";
const dateOnly = z.preprocess(
  emptyToUndefined,
  z.string().regex(DATE_PATTERN, DATE_MESSAGE).optional(),
);
// Same rule as dateOnly, but nullable — used on update schemas where an
// explicit null clears a previously-set date. Blank/omitted values on both
// variants normalize to undefined via emptyToUndefined before validation, so
// they never fail with a raw regex/type-mismatch message.
const nullableDateOnly = z.preprocess(
  emptyToUndefined,
  z.string().regex(DATE_PATTERN, DATE_MESSAGE).optional().nullable(),
);

export const createVendorSchema = z.object({
  name: z
    .string({ error: "Vendor name is required." })
    .trim()
    .min(1, "Vendor name is required.")
    .max(200, "Vendor name must be 200 characters or fewer."),
  legalName: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  isPreferred: z.boolean().optional(),
  primaryPhone: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  primaryEmail: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .toLowerCase()
      .email("Email address is invalid.")
      .max(200, "Email address must be 200 characters or fewer.")
      .optional(),
  ),
  website: z.preprocess(emptyToUndefined, z.string().trim().max(300).optional()),
  addressLine1: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  addressLine2: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  city: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  state: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  postalCode: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  country: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  accountNumber: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
  coverageMode: z.enum(VENDOR_COVERAGE_MODES).default("all"),
  insuranceExpiresAt: dateOnly,
  licenseExpiresAt: dateOnly,
  contractExpiresAt: dateOnly,
  categoryIds: z.array(z.string().uuid()).max(50).optional(),
});

export const updateVendorSchema = z.object({
  name: z
    .string({ error: "Vendor name is required." })
    .trim()
    .min(1, "Vendor name is required.")
    .max(200, "Vendor name must be 200 characters or fewer.")
    .optional(),
  legalName: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional().nullable()),
  isActive: z.boolean().optional(),
  isPreferred: z.boolean().optional(),
  primaryPhone: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional().nullable()),
  primaryEmail: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .toLowerCase()
      .email("Email address is invalid.")
      .max(200, "Email address must be 200 characters or fewer.")
      .optional()
      .nullable(),
  ),
  website: z.preprocess(emptyToUndefined, z.string().trim().max(300).optional().nullable()),
  addressLine1: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional().nullable()),
  addressLine2: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional().nullable()),
  city: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional().nullable()),
  state: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional().nullable()),
  postalCode: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional().nullable()),
  country: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional().nullable()),
  accountNumber: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional().nullable()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional().nullable()),
  coverageMode: z.enum(VENDOR_COVERAGE_MODES).optional(),
  insuranceExpiresAt: nullableDateOnly,
  licenseExpiresAt: nullableDateOnly,
  contractExpiresAt: nullableDateOnly,
  categoryIds: z.array(z.string().uuid()).max(50).optional(),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
