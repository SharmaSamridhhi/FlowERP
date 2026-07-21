import type { Request, Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "./error-handler.middleware.js";

describe("errorHandler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("responds with a generic 500 and logs the error server-side", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;
    const err = new Error("boom");

    errorHandler(err, {} as Request, res, vi.fn());

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: { message: "Internal server error" },
    });
    expect(console.error).toHaveBeenCalledWith(err);
  });
});
