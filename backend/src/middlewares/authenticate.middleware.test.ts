import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { describe, expect, it, vi } from "vitest";
import { env } from "../config/env.js";
import { authenticate } from "./authenticate.middleware.js";

function mockRequest(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

function signToken(overrides: { expiresIn?: number | string } = {}): string {
  return jwt.sign({ sub: "user-1", email: "a@b.com", role: "ADMIN" }, env.jwtSecret, {
    expiresIn: (overrides.expiresIn ?? "1h") as jwt.SignOptions["expiresIn"],
  });
}

describe("authenticate", () => {
  it("attaches req.user from a valid Bearer token and calls next() with no error", () => {
    const req = mockRequest({ authorization: `Bearer ${signToken()}` });
    const next = vi.fn();

    authenticate(req, {} as Response, next);

    expect(req.user).toEqual({ id: "user-1", email: "a@b.com", role: "ADMIN" });
    expect(next).toHaveBeenCalledWith();
  });

  it("calls next with an UnauthorizedError when the Authorization header is missing", () => {
    const req = mockRequest();
    const next = vi.fn();

    authenticate(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    expect(req.user).toBeUndefined();
  });

  it("calls next with an UnauthorizedError when the header isn't a Bearer token", () => {
    const req = mockRequest({ authorization: "Basic abc123" });
    const next = vi.fn();

    authenticate(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it("calls next with an UnauthorizedError for a malformed token", () => {
    const req = mockRequest({ authorization: "Bearer not-a-real-token" });
    const next = vi.fn();

    authenticate(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it("calls next with an UnauthorizedError for an expired token", () => {
    const req = mockRequest({ authorization: `Bearer ${signToken({ expiresIn: -1 })}` });
    const next = vi.fn();

    authenticate(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it("calls next with an UnauthorizedError for a token signed with a different secret", () => {
    const wrongSecretToken = jwt.sign(
      { sub: "user-1", email: "a@b.com", role: "ADMIN" },
      "wrong-secret",
      {
        expiresIn: "1h",
      },
    );
    const req = mockRequest({ authorization: `Bearer ${wrongSecretToken}` });
    const next = vi.fn();

    authenticate(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});
