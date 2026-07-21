import type { ErrorEnvelope, SuccessEnvelope } from "@flowerp/shared";
import { env } from "../config/env.js";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Hook point for FLO-011 (specs/FLO-011-auth-rbac.md) — until auth exists,
// every request goes out with no Authorization header.
let getAuthToken: () => string | null = () => null;

export function configureAuthTokenGetter(fn: () => string | null): void {
  getAuthToken = fn;
}

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

function buildUrl(path: string, query?: ApiRequestOptions["query"]): string {
  const url = new URL(path, env.apiBaseUrl);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

// Calls the backend, unwraps the shared success/error envelope (see
// packages/shared/src/http/envelope.ts), and throws a typed, catchable
// ApiError on any non-2xx response instead of letting callers deal with
// raw fetch Response objects.
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<SuccessEnvelope<T>> {
  const token = getAuthToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const json: unknown = await response.json();

  if (!response.ok) {
    const errorBody = json as ErrorEnvelope;
    throw new ApiError(
      response.status,
      errorBody.error.code,
      errorBody.error.message,
      errorBody.error.details,
    );
  }

  return json as SuccessEnvelope<T>;
}
