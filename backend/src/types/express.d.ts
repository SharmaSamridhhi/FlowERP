// Parsed request data from validateRequest() is attached here rather than
// reassigned onto req.body/query/params directly — req.query is a
// getter-only property in Express 5 (silently ignores reassignment rather
// than throwing), so a single, consistently-typed attachment point avoids
// that footgun for all three. See specs/FLO-007-validation-error-handling.md.
declare module "express-serve-static-core" {
  interface Request {
    validated?: {
      body?: unknown;
      query?: unknown;
      params?: unknown;
    };
  }
}

export {};
