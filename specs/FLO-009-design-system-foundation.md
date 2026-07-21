# FLO-009 — Frontend Design System Foundation (Atomic Design)

**Phase:** 2 — Engineering Foundations (Good Practices I)

**Status:**
- [ ] Not Started
- [ ] Completed

## Description

Populate the Atomic Design skeleton created in FLO-003 with a real, minimal component library — the atoms and molecules every Phase 3 screen will be built from — plus a page shell (organism-level app layout: sidebar/nav + content area) and shared design tokens (color, spacing, typography via Tailwind theme config). This is what makes "clean admin-style UI" and "responsive UI" achievable consistently across four different business modules instead of each screen reinventing buttons and tables.

## User Story

As a frontend developer building a business module screen, I want a ready set of atoms, molecules, and a page layout template, so that I compose screens from existing building blocks instead of styling a new button or table from scratch every time.

## Scope

**Included:**
- Design tokens in `tailwind.config.ts`: a small brand/neutral color palette, spacing scale (Tailwind defaults extended only where needed), typography scale — enough to make "admin-style" visually consistent, not a full brand system.
- **Atoms:** `Button` (variants: primary/secondary/danger/ghost; sizes; loading state), `Input`, `Select`, `Textarea`, `Badge` (for status pills — Lead/Active/Inactive, Draft/Confirmed/Cancelled, etc.), `Spinner`, `Label`, `IconButton`.
- **Molecules:** `FormField` (label + input + error message, composing atoms, designed to plug into a Zod-validated form), `SearchBar`, `Pagination` (built against the FLO-008 pagination meta shape), `Modal`/`Dialog`, `Toast`/notification (for success/error feedback, consuming FLO-008's typed API errors).
- **Organisms:** `AppSidebar` (nav links, role-aware placeholder — full role-gating logic lands with FLO-011, but the component accepts a `role` prop and filters nav items), `AppHeader` (user info placeholder, logout placeholder), `DataTable` (generic sortable/paginated table organism used by every list screen in Phase 3 — columns config, row rendering, empty-state, loading-state).
- **Templates:** `AppShellTemplate` (sidebar + header + content slot, responsive: collapses sidebar on mobile), `AuthLayoutTemplate` (centered card layout for login).
- A component-development reference (Storybook is explicitly **not** introduced — see Implementation Notes) — instead, one lightweight `/dev/components` route (dev-only, stripped from production build or gated behind `import.meta.env.DEV`) rendering every atom/molecule with its variants, serving as the visual reference until real screens exist.
- Applied to update the FLO-003 route stubs (`/`, `/login`, not-found) to use `AppShellTemplate`/`AuthLayoutTemplate` instead of raw placeholder `div`s, proving the components compose into real layouts.

**Excluded:**
- Any business-specific component (e.g., a `CustomerCard` or `ChallanLineItemRow`) — those are built by their owning Phase 3 spec, composed from these atoms/molecules.
- Real navigation items or role-based visibility logic (FLO-011) — `AppSidebar` takes a `role` prop and a nav-item list, both passed in stub/hardcoded form for now.
- Dark mode (not required by the assignment; not in scope for this roadmap).

## Acceptance Criteria

- [ ] Every component listed above exists under the correct Atomic Design folder (`atoms/`, `molecules/`, `organisms/`, `templates/`), is exported from a barrel file, and has at least one unit test (render + basic interaction) per FLO-006 conventions.
- [ ] `DataTable` correctly renders a loading state, an empty state, and a populated state with sortable columns, verified with a unit test using representative fake data (not real API data, since no entity module exists yet).
- [ ] `Pagination` renders correct page controls from a sample `meta.pagination` object shaped per FLO-008's contract, and calls an `onPageChange` callback with the right page number when a control is clicked.
- [ ] `AppShellTemplate` is responsive: sidebar is visible/expanded at desktop width and collapses to a toggleable/off-canvas state at mobile width, verified manually in the browser at 375px and 1280px.
- [ ] The `/` and `/login` routes from FLO-003 now render through `AppShellTemplate`/`AuthLayoutTemplate` respectively instead of bare placeholder text.
- [ ] The dev-only component reference route renders every atom/molecule with its variants and does not appear in a production build (verified by checking the built output/bundle, or by confirming the route is guarded by a dev-only check).
- [ ] No component in `atoms/` imports from `molecules/`, `organisms/`, or `templates/`, and no `molecules/` component imports from `organisms/`/`templates/` — the dependency direction only flows upward (atoms → molecules → organisms → templates → pages), checked by code review / a lint rule if feasible.

## Technical Tasks

1. Extend `tailwind.config.ts` with the token set (colors, spacing/typography extensions as needed).
2. Build each atom as a small, typed, prop-driven component with Tailwind classes; unit test each.
3. Build each molecule composing atoms; unit test each, including the `Pagination` callback behavior and `FormField`'s error-display behavior.
4. Build `AppSidebar`, `AppHeader`, `DataTable` organisms; unit test `DataTable`'s three states.
5. Build `AppShellTemplate` and `AuthLayoutTemplate`; verify responsiveness manually via the browser tool.
6. Add the dev-only `/dev/components` route rendering a catalog of all atoms/molecules and their variants, guarded so it's excluded from production.
7. Update the FLO-003 stub routes to render through the new templates.
8. Enforce and spot-check the upward-only import direction across the four component tiers.

## Dependencies

FLO-003, FLO-005.

## Implementation Notes

- Storybook is deliberately skipped: it's a real tool with real value, but standing it up (config, build integration, CI wiring) is disproportionate overhead for a project this size within the roadmap's time economics. The dev-only `/dev/components` route gets ~80% of the "see every variant" benefit for a fraction of the setup cost — a pragmatic substitution, not a corner cut on the actual requirement (a working, reviewable component set).
- `DataTable` is the single highest-leverage component in this spec: every list screen in Phase 3 (customers, products, challans, purchase orders) uses it. Invest real care in its column-config API now — a redesign mid-Phase-3 would ripple across four modules.
- Keep components prop-driven and free of direct API calls — atoms/molecules/organisms/templates render what they're given; data-fetching belongs in the `pages/` layer built per Phase 3 module. This boundary is what keeps the design system reusable and independently testable.
