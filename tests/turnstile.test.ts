import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "../lib/security";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Turnstile verification", () => {
  it("requires a token before contacting Cloudflare", async () => {
    vi.stubEnv("TURNSTILE_SECRET", "test-secret");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    expect(await verifyTurnstile(undefined, "127.0.0.1")).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends the token to Siteverify and honors its result", async () => {
    vi.stubEnv("TURNSTILE_SECRET", "test-secret");
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ success: true }))
      .mockResolvedValueOnce(Response.json({ success: false }));
    vi.stubGlobal("fetch", fetch);

    expect(await verifyTurnstile("valid-token", "127.0.0.1")).toBe(true);
    expect(fetch.mock.calls[0][0]).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    );
    expect(fetch.mock.calls[0][1].body.get("response")).toBe("valid-token");
    expect(await verifyTurnstile("invalid-token", "127.0.0.1")).toBe(false);
  });
});
