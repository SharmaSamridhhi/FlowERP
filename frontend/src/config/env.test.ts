import { afterEach, describe, expect, it, vi } from "vitest";

describe("env", () => {
  const originalApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  afterEach(() => {
    if (originalApiBaseUrl === undefined) {
      delete import.meta.env.VITE_API_BASE_URL;
    } else {
      import.meta.env.VITE_API_BASE_URL = originalApiBaseUrl;
    }
    vi.resetModules();
  });

  it("falls back to the default API base URL when VITE_API_BASE_URL is unset", async () => {
    delete import.meta.env.VITE_API_BASE_URL;
    vi.resetModules();

    const { envResult, env } = await import("./env.js");

    expect(envResult).toEqual({ success: true, env: { apiBaseUrl: "http://localhost:4000" } });
    expect(env.apiBaseUrl).toBe("http://localhost:4000");
  });

  it("reads VITE_API_BASE_URL from the environment when set to a valid URL", async () => {
    import.meta.env.VITE_API_BASE_URL = "https://api.flowerp.example";
    vi.resetModules();

    const { env } = await import("./env.js");

    expect(env.apiBaseUrl).toBe("https://api.flowerp.example");
  });

  it("reports failure instead of silently falling back when VITE_API_BASE_URL is malformed", async () => {
    import.meta.env.VITE_API_BASE_URL = "not-a-url";
    vi.resetModules();

    const { envResult, env } = await import("./env.js");

    expect(envResult.success).toBe(false);
    // Never used in practice — main.tsx renders a boot-error screen
    // instead of anything that would read `env` — but must never be the
    // malformed value itself.
    expect(env.apiBaseUrl).not.toBe("not-a-url");
  });
});
