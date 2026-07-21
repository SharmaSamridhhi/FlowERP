import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { authorize } from "./authorize.middleware.js";

function mockRequest(user?: {
  id: string;
  email: string;
  role: "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS";
}): Request {
  return { user } as unknown as Request;
}

describe("authorize", () => {
  it("calls next() with no error when the user's role is allowed", () => {
    const req = mockRequest({ id: "1", email: "a@b.com", role: "ADMIN" });
    const next = vi.fn();

    authorize("ADMIN")(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("allows any of multiple permitted roles", () => {
    const req = mockRequest({ id: "1", email: "a@b.com", role: "WAREHOUSE" });
    const next = vi.fn();

    authorize("ADMIN", "WAREHOUSE")(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("calls next with a ForbiddenError when the user's role isn't allowed", () => {
    const req = mockRequest({ id: "1", email: "a@b.com", role: "SALES" });
    const next = vi.fn();

    authorize("ADMIN")(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it("calls next with an UnauthorizedError when req.user is missing", () => {
    const req = mockRequest(undefined);
    const next = vi.fn();

    authorize("ADMIN")(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});
