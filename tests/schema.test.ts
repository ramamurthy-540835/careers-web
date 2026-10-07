import { describe, expect, it } from "vitest";
import { applicationSchema, uploadSchema } from "../lib/application-schema";

const expiry = new Date(new Date().setMonth(new Date().getMonth() + 19))
  .toISOString()
  .slice(0, 10);
const valid = {
  full_name: "Ada Lovelace",
  email: "ADA@EXAMPLE.COM",
  whatsapp: "+918925310144",
  country_of_residence: "in",
  nationality: "IN",
  passport_valid: true,
  passport_expiry: expiry,
  willing_to_travel: true,
  preferred_postings: [],
  role: "ai_engineer",
  experience_years: "3",
  highest_education: "masters",
  certifications: [
    { provider: "Google Cloud", name: " Professional ML Engineer " },
  ],
  prism_ai_ready: true,
  prism_ai_experience: "used",
  motivation: "A".repeat(80),
  consent_dpdp: "true",
  consent_contact: "true",
  source: "linkedin",
  utm: {},
};

describe("application schema", () => {
  it("accepts and normalizes a valid payload", () => {
    const parsed = applicationSchema.parse(valid);
    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.country_of_residence).toBe("IN");
    expect(parsed.experience_years).toBe(3);
    expect(parsed.certifications[0].name).toBe("Professional ML Engineer");
    expect(parsed.consent_dpdp).toBe(true);
  });
  it("resolves country names and suggestions to ISO codes", () => {
    const parsed = applicationSchema.parse({
      ...valid,
      country_of_residence: "India (IN)",
      nationality: "India",
    });
    expect(parsed.country_of_residence).toBe("IN");
    expect(parsed.nationality).toBe("IN");
    expect(applicationSchema.safeParse({ ...valid, nationality: "ZZ" }).success).toBe(false);
  });
  it.each([
    "full_name",
    "whatsapp",
    "country_of_residence",
    "nationality",
    "certifications",
    "motivation",
    "consent_dpdp",
    "consent_contact",
  ])("rejects missing %s", (field) => {
    const value =
      field === "certifications"
        ? []
        : field.startsWith("consent")
          ? false
          : "";
    expect(
      applicationSchema.safeParse({ ...valid, [field]: value }).success,
    ).toBe(false);
  });
  it("rejects an over-10MB CV", () =>
    expect(
      uploadSchema.safeParse({
        filename: "cv.pdf",
        mime: "application/pdf",
        size: 10 * 1024 * 1024 + 1,
      }).success,
    ).toBe(false));
});
