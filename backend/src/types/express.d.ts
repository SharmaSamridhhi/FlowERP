import type { Role } from "../generated/prisma/client.js";

// Parsed request data from validateRequest() is attached here rather than
// reassigned onto req.body/query/params directly — req.query is a
// getter-only property in Express 5 (silently ignores reassignment rather
// than throwing), so a single, consistently-typed attachment point avoids
// that footgun for all three. See specs/FLO-007-validation-error-handling.md.
//
// req.user comes straight from the verified JWT payload (see
// authenticate.middleware.ts) — id/email/role only, no DB round trip per
// request. See specs/FLO-011-auth-rbac.md.
declare module "express-serve-static-core" {
  interface Request {
    validated?: {
      body?: unknown;
      query?: unknown;
      params?: unknown;
    };
    user?: {
      id: string;
      email: string;
      role: Role;
    };
  }
}

export {};
