import { z } from "zod";

export const roles = [
  "climate_scientist",
  "ai_engineer",
  "data_engineer",
  "gis_specialist",
  "science_writer",
  "project_coordinator",
] as const;
const country = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, "Choose a two-letter country code");
const consent = (message: string) =>
  z.coerce.boolean().refine(Boolean, { message });

export const certificationSchema = z.object({
  provider: z.enum([
    "Google Cloud",
    "AWS",
    "Microsoft Azure",
    "PMI",
    "ISO/IEC 42001 Lead",
    "IPCC/UN training (specify)",
    "University/Research (specify)",
    "Other",
  ]),
  name: z.string().trim().min(2, "Enter a certification name").max(120),
  credential_id: z.string().trim().max(120).optional().default(""),
  verify_url: z
    .string()
    .trim()
    .url("Enter a valid HTTPS URL")
    .refine((value) => value.startsWith("https://"), "HTTPS required")
    .optional()
    .or(z.literal(""))
    .default(""),
  expiry: z.string().date().optional().or(z.literal("")).default(""),
});

export const applicationFieldsSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, "Use E.164, e.g. +918925310144"),
  country_of_residence: country,
  nationality: country,
  passport_valid: consent(
    "A valid passport is mandatory for every NELTURE role. You can return and apply once you have one.",
  ),
  passport_expiry: z.string().date(),
  willing_to_travel: consent(
    "All roles are on-site at UN project locations. We do not have remote options.",
  ),
  preferred_postings: z.array(country).max(5).default([]),
  role: z.enum(roles),
  experience_years: z.coerce.number().int().min(0).max(60),
  highest_education: z.enum([
    "secondary",
    "diploma",
    "bachelors",
    "masters",
    "doctorate",
    "other",
  ]),
  certifications: z.preprocess(
    (value) =>
      Array.isArray(value)
        ? value.filter(
            (item) =>
              typeof item === "object" &&
              item !== null &&
              String((item as { name?: unknown }).name ?? "").trim(),
          )
        : value,
    z.array(certificationSchema).min(1, "Add at least one certification"),
  ),
  prism_ai_ready: consent("Prism AI readiness confirmation is required."),
  prism_ai_experience: z.enum(["none", "read_docs", "used", "built_on"]),
  motivation: z
    .string()
    .trim()
    .min(80, "Your motivation must be at least 80 characters.")
    .max(1200),
  sample_url: z
    .string()
    .trim()
    .url("Enter a valid HTTPS URL")
    .refine((value) => value.startsWith("https://"), "HTTPS required")
    .optional()
    .or(z.literal(""))
    .default(""),
  consent_dpdp: consent("Consent is required."),
  consent_contact: consent("Contact consent is required."),
  source: z.enum(["linkedin", "referral", "other"]).default("other"),
  source_detail: z.string().trim().max(200).optional().default(""),
  utm: z.record(z.string(), z.string()).default({}),
});

export const applicationSchema = applicationFieldsSchema.superRefine(
  (data, context) => {
    const limit = new Date();
    limit.setMonth(limit.getMonth() + 18);
    if (new Date(data.passport_expiry) < limit)
      context.addIssue({
        code: "custom",
        path: ["passport_expiry"],
        message: "Passport must be valid for at least 18 months.",
      });
  },
);

export const applicationStepSchemas = {
  1: applicationFieldsSchema.pick({
    full_name: true,
    email: true,
    whatsapp: true,
    country_of_residence: true,
    nationality: true,
  }),
  2: applicationFieldsSchema.pick({
    passport_valid: true,
    passport_expiry: true,
    willing_to_travel: true,
  }),
  3: applicationFieldsSchema.pick({
    role: true,
    experience_years: true,
    highest_education: true,
    certifications: true,
    prism_ai_ready: true,
  }),
  4: applicationFieldsSchema.pick({
    motivation: true,
    sample_url: true,
    consent_dpdp: true,
    consent_contact: true,
  }),
};

export type ApplicationInput = z.infer<typeof applicationFieldsSchema>;
export const uploadSchema = z.object({
  filename: z
    .string()
    .min(1)
    .max(180)
    .regex(/^[\w .()\-]+$/, "Unsafe filename"),
  mime: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]),
  size: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024, "CV must be 10 MB or smaller"),
});
export const statusSchema = z.object({
  status: z.enum(["shortlisted", "rejected", "onboarding"]),
  note: z.string().trim().min(1).max(2000),
});
