import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const google = vi.hoisted(() => ({
  createApplication: vi.fn(),
  event: vi.fn(),
  signedPut: vi.fn().mockResolvedValue(["https://upload.example/cv"]),
}));

vi.mock("../lib/google", () => ({
  ...google,
  safeName: (name: string) => name,
}));

import { POST } from "../app/api/applications/route";

const expiry = new Date(new Date().setMonth(new Date().getMonth() + 19))
  .toISOString()
  .slice(0, 10);
const valid = {
  full_name: "Ada Lovelace",
  email: "ada@example.com",
  whatsapp: "+918925310144",
  country_of_residence: "IN",
  nationality: "IN",
  passport_valid: true,
  passport_expiry: expiry,
  willing_to_travel: true,
  role: "ai_engineer",
  experience_years: 3,
  highest_education: "masters",
  certifications: [{ provider: "Google Cloud", name: "Professional ML Engineer" }],
  prism_ai_ready: true,
  prism_ai_experience: "used",
  motivation: "A".repeat(80),
  consent_dpdp: true,
  consent_contact: true,
  cv: { filename: "cv.pdf", mime: "application/pdf", size: 100 },
  bot_field: "",
};

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/applications", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("TURNSTILE_SITE_KEY", "");
  vi.stubEnv("TURNSTILE_SECRET", "");
  google.createApplication.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("application bot checks", () => {
  it("accepts an application when Turnstile is not configured", async () => {
    const response = await POST(request(valid));
    expect(response.status).toBe(200);
    expect(google.createApplication).toHaveBeenCalledOnce();
  });

  it("rejects a filled spam-trap field", async () => {
    const response = await POST(request({ ...valid, bot_field: "spam.example" }));
    expect(response.status).toBe(400);
    expect(google.createApplication).not.toHaveBeenCalled();
  });

  it("blocks a partially configured Turnstile deployment", async () => {
    vi.stubEnv("TURNSTILE_SITE_KEY", "public-key");
    const response = await POST(request(valid));
    expect(response.status).toBe(503);
    expect(google.createApplication).not.toHaveBeenCalled();
  });

  it("requires a token when both Turnstile keys are configured", async () => {
    vi.stubEnv("TURNSTILE_SITE_KEY", "public-key");
    vi.stubEnv("TURNSTILE_SECRET", "private-key");
    const response = await POST(request(valid));
    expect(response.status).toBe(400);
    expect(google.createApplication).not.toHaveBeenCalled();
  });
});
