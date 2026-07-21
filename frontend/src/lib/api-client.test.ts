import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest, ApiError, configureAuthTokenGetter } from "./api-client";

function mockFetchOnce(response: {
  ok: boolean;
  status: number;
  body: unknown;
}): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    json: () => Promise.resolve(response.body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("apiRequest", () => {
  beforeEach(() => {
    configureAuthTokenGetter(() => null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the parsed success envelope, unwrapped", async () => {
    mockFetchOnce({ ok: true, status: 200, body: { data: { status: "ok" } } });

    const result = await apiRequest<{ status: string }>("/health");

    expect(result).toEqual({ data: { status: "ok" } });
  });

  it("throws a typed, catchable ApiError on a non-2xx response instead of an unhandled rejection", async () => {
    mockFetchOnce({
      ok: false,
      status: 404,
      body: { error: { code: "NOT_FOUND", message: "Customer not found" } },
    });

    await expect(apiRequest("/customers/does-not-exist")).rejects.toBeInstanceOf(ApiError);

    mockFetchOnce({
      ok: false,
      status: 404,
      body: { error: { code: "NOT_FOUND", message: "Customer not found" } },
    });

    try {
      await apiRequest("/customers/does-not-exist");
      expect.unreachable("apiRequest should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiError = err as ApiError;
      expect(apiError.status).toBe(404);
      expect(apiError.code).toBe("NOT_FOUND");
      expect(apiError.message).toBe("Customer not found");
    }
  });

  it("preserves error details from a validation failure", async () => {
    const details = [{ path: ["limit"], message: "Expected number" }];
    mockFetchOnce({
      ok: false,
      status: 400,
      body: { error: { code: "VALIDATION_ERROR", message: "Validation failed", details } },
    });

    await expect(apiRequest("/internal/validation-demo")).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      details,
    });
  });

  it("omits the Authorization header when no token getter is configured", async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, body: { data: null } });

    await apiRequest("/health");

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((requestInit.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("attaches a Bearer Authorization header once a token getter is configured", async () => {
    configureAuthTokenGetter(() => "test-token");
    const fetchMock = mockFetchOnce({ ok: true, status: 200, body: { data: null } });

    await apiRequest("/health");

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((requestInit.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
  });

  it("appends query params and omits undefined values", async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, body: { data: [] } });

    await apiRequest("/internal/validation-demo/paginated", {
      query: { page: 2, limit: 5, search: undefined },
    });

    const [requestUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
    const url = new URL(requestUrl);
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.has("search")).toBe(false);
  });
});
