# Testing (frontend)

Vitest with a `jsdom` environment, React Testing Library, and `@testing-library/jest-dom` matchers.

## Conventions

- Test files are colocated with the source they test, named `*.test.tsx` (or `*.test.ts` for non-component code) — e.g. `src/App.test.tsx` sits next to `src/App.tsx`. No parallel `__tests__` tree.
- Render through React Testing Library (`render`, `screen`) and assert on what a user would see, not on implementation details (component internals, state shape).
- Routing tests wrap the component under test in a `MemoryRouter` with `initialEntries`, rather than relying on `main.tsx` (which has real side effects — mounting to `document`, importing global CSS — that a unit test shouldn't depend on).
- `src/test/setup.ts` wires up `@testing-library/jest-dom/vitest` matchers globally; it's referenced from `vitest.config.ts`'s `setupFiles`, not imported per-test.

## Running tests

- `npm run test -w frontend` — run once, exit (CI-safe, no watch mode).
- `npm run test:watch -w frontend` — watch mode for local development.
- `npm run test:coverage -w frontend` — run with coverage; fails if any metric drops below the threshold below.

## Coverage

`v8` provider, threshold: 70% lines/statements/functions/branches. This is a floor, not a target — see [FLO-006](../specs/FLO-006-testing-infrastructure.md) for the full rationale. Placeholder route stubs (like `LoginPage`) are not force-tested just to pad the number; they get real tests once they're real screens, starting with [FLO-011](../specs/FLO-011-auth-rbac.md).
