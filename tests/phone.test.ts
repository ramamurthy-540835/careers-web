import { describe, expect, it } from "vitest";
import { countryCallingCode, normalizeWhatsApp } from "../lib/phone";

describe("WhatsApp country prefix", () => {
  it("formats a local Indian number using the selected country", () => {
    expect(countryCallingCode("India (IN)")).toBe("+91");
    expect(normalizeWhatsApp("7845293775", "India (IN)")).toBe("+917845293775");
  });
  it("preserves an already international number", () => {
    expect(normalizeWhatsApp("+918925310144", "India")).toBe("+918925310144");
  });
  it("does not guess a prefix without a valid country", () => {
    expect(normalizeWhatsApp("7845293775", "")).toBe("7845293775");
  });
});
