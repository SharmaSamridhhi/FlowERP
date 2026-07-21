# FLO-003 — Frontend Application Bootstrap

**Phase:** 1 — Project Foundation

**Status:**
- [ ] Not Started
- [x] Completed

## Description

Stand up the frontend application skeleton in the `frontend/` workspace: React + TypeScript via Vite, client-side routing, Tailwind CSS wired in, and a base folder structure that anticipates the Atomic Design layout FLO-009 will populate. This spec produces a running shell app (a layout with empty placeholder routes) — no design system components, no API integration, no auth — just a booting, routable, styled-capable React app.

## User Story

As a frontend developer, I want a running React + TypeScript app with routing and styling wired in, so that I can start building actual screens and components against a known structure instead of a bare Vite template.

## Scope

**Included:**
- Vite + React + TypeScript project in `frontend/`.
- React Router configured with a minimal route table (e.g., `/`, `/login` as placeholders returning stub text) and a not-found route.
- Tailwind CSS installed and configured (PostCSS config, base Tailwind directives in the global stylesheet), verified with one visibly-styled element.
- Base folder skeleton anticipating Atomic Design (`src/components/atoms`, `molecules`, `organisms`, `templates`, `src/pages`) — created empty/with `.gitkeep` here; actual components are FLO-009.
- `src/lib` or `src/config` for a frontend env-reading module (`import.meta.env`), no validation yet (FLO-007/FLO-008 territory).
- Dev script (`vite dev`), build script (`vite build`), preview script.
- Responsive viewport meta tag and a base CSS reset consistent with the "Responsive UI" requirement.

**Excluded:**
- Any real UI components, design tokens, or component library (FLO-009).
- API client / data fetching setup beyond confirming the env module reads a base URL variable (FLO-008 defines the actual client and contracts).
- Authentication screens or route guarding (FLO-011).

## Acceptance Criteria

- [ ] `npm run dev -w frontend` starts Vite and the app loads in a browser without console errors.
- [ ] `npm run build -w frontend` produces a production build in `frontend/dist` with no TypeScript errors.
- [ ] Navigating to `/`, `/login`, and an unknown path renders the corresponding stub/not-found content via React Router (client-side, no full page reload).
- [ ] A Tailwind utility class (e.g., a background color or padding) visibly applies to an element, confirming the Tailwind pipeline works end-to-end.
- [ ] The page renders correctly (no horizontal overflow, layout holds) at a mobile width (375px) and a desktop width (1280px), confirmed manually in the browser.
- [ ] `src/components/{atoms,molecules,organisms,templates}` and `src/pages` exist as the agreed empty skeleton.

## Technical Tasks

1. Scaffold `frontend` with Vite's `react-ts` template.
2. Install and configure React Router; define a minimal route table in `src/routes` or `src/App.tsx`.
3. Install Tailwind CSS + PostCSS + Autoprefixer; configure `tailwind.config.ts` content globs to cover `src/**/*.{ts,tsx}`; add Tailwind directives to the global stylesheet; import it once at the app entry point.
4. Create the Atomic Design + `pages` folder skeleton with placeholder/index files as needed for the folders to be meaningful in version control.
5. Add `src/config/env.ts` reading `import.meta.env.VITE_API_BASE_URL` (or similar) with a local-dev default.
6. Verify responsive behavior manually via the browser tool at mobile and desktop widths.
7. Add `dev`, `build`, `preview` scripts to `frontend/package.json`.

## Dependencies

FLO-001.

## Implementation Notes

- Tailwind is chosen over CSS Modules/styled-components for velocity and because utility classes compose well with the Atomic Design layering (atoms carry most of the styling; organisms/templates mostly arrange). If the team later prefers a different styling approach, that's a Phase 5 conversation, not a Phase 1 blocker.
- Keep route stubs to literal placeholder text (`<div>Login page placeholder</div>`) — real pages arrive with their owning module's spec (FLO-011 for login, etc.).
- Do not reach for TanStack Query or any HTTP client yet; FLO-008 introduces the API client alongside the shared contracts it depends on, so adding one here would be built ahead of what it needs to consume.
