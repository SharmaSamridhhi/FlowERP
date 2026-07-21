import type { Request, Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "../generated/prisma/client.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { errorHandler } from "./error-handler.middleware.js";

function mockResponse() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { status } as unknown as Response;
  return { res, status, json };
}

describe("errorHandler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("responds with a generic 500 and logs the error server-side for an unrecognized error", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { res, status, json } = mockResponse();
    const err = new Error("boom");

    errorHandler(err, {} as Request, res, vi.fn());

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
    expect(console.error).toHaveBeenCalledWith(err);
  });

  it("does not leak the original error message for an unrecognized error", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { res, json } = mockResponse();

    errorHandler(new Error("sensitive internal detail"), {} as Request, res, vi.fn());

    const body = json.mock.calls[0]?.[0];
    expect(JSON.stringify(body)).not.toContain("sensitive internal detail");
  });

  it("responds with an AppError's own status/code/message and does not log (status < 500)", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { res, status, json } = mockResponse();

    errorHandler(new NotFoundError("Customer not found"), {} as Request, res, vi.fn());

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: { code: "NOT_FOUND", message: "Customer not found" },
    });
    expect(console.error).not.toHaveBeenCalled();
  });

  it("includes details on a ValidationError when present", () => {
    const { res, json } = mockResponse();
    const details = [{ path: ["limit"], message: "Expected number" }];

    errorHandler(new ValidationError("Validation failed", details), {} as Request, res, vi.fn());

    expect(json).toHaveBeenCalledWith({
      error: { code: "VALIDATION_ERROR", message: "Validation failed", details },
    });
  });

  it("maps a Prisma P2002 unique-constraint violation to 409 Conflict", () => {
    const { res, status, json } = mockResponse();
    const err = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "test",
      meta: { target: ["sku"] },
    });

    errorHandler(err, {} as Request, res, vi.fn());

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      error: { code: "CONFLICT", message: "A record with this sku already exists." },
    });
  });

  it("maps a Prisma P2025 record-not-found error to 404", () => {
    const { res, status, json } = mockResponse();
    const err = new Prisma.PrismaClientKnownRequestError("Record not found", {
      code: "P2025",
      clientVersion: "test",
    });

    errorHandler(err, {} as Request, res, vi.fn());

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: { code: "NOT_FOUND", message: "Record not found" },
    });
  });

  it("maps an unrecognized Prisma error code to a logged 500", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { res, status, json } = mockResponse();
    const err = new Prisma.PrismaClientKnownRequestError("Some other Prisma error", {
      code: "P9999",
      clientVersion: "test",
    });

    errorHandler(err, {} as Request, res, vi.fn());

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: { code: "DATABASE_ERROR", message: "Database error" },
    });
    expect(console.error).toHaveBeenCalledWith(err);
  });
});
