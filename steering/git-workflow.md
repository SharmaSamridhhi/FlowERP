# Git Workflow

This document is the binding Git policy for implementing the specs under [`/specs`](../specs/README.md). It applies to every future session that implements a specification in this repository. Follow it exactly; do not infer a different workflow from habit or from what a given task seems to need.

## Before starting any specification

1. Checkout `main`.
2. Pull the latest changes on `main`.
3. Create a dedicated branch off the updated `main`, named:
   ```
   FLO-xxx-short-description
   ```
   e.g. `FLO-004-database-schema-foundation`, `FLO-011-auth-rbac`. The number must match the spec ID; the description is a short kebab-case summary of the spec title.
4. Every specification is implemented in its own branch. Never implement two specs on one branch, and never implement a spec on `main`.

## While implementing

Allowed without asking:
- Creating commits, amending local (unpushed) commits, rebasing locally, and any Git read operation (log, diff, status, branch, show, blame, etc.).
- All commits must follow [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): subject`, e.g. `feat(customers): add customer search endpoint`, `test(auth): cover role guard rejection paths`, `chore(FLO-004): add prisma migration`. Prefer scoping to the module or spec ID.

Never do, under any circumstances, without the user explicitly instructing it in that moment:
- Push any branch to a remote.
- Create a Pull Request.
- Merge into `main`.
- Add yourself (the agent) as a co-author or contributor on any commit.
- Rewrite remote Git history (no force-push, no remote rebase, no history rewrite on a branch that has been pushed).

If in doubt whether an action counts as one of the above, treat it as prohibited and ask.

## Completing a specification

Before declaring a specification done:
1. Verify every item in that spec's **Acceptance Criteria** is satisfied.
2. Run and pass the full test suite for the affected package(s).
3. Run and pass linting.
4. Run and pass formatting checks.
5. Run and pass any other quality gate defined for the project (type-checking, build).
6. Flip that spec's `**Status:**` checkbox from `Not Started` to `Completed` in its own file (`specs/FLO-XXX-*.md`), and update its row in the index table in [`specs/README.md`](../specs/README.md) to `✅ Completed`. Include this as part of the same branch/commit as the implementation, not a separate follow-up.

Once all of the above pass, stop. Do not push, do not open a PR, do not merge. Ask the user to review the implementation.

From there:
- The user pushes the branch, opens the Pull Request, and merges it into `main`.
- The user tells you explicitly when the PR has been reviewed and merged, and that local `main` is up to date (or you must pull it yourself once told to).
- You must not begin implementing another specification until this confirmation is given. Treat "I merged it" or "go ahead with the next one" as the confirmation; treat silence or an unrelated message as not confirmation.

## Working the queue

- Implement exactly one specification at a time, in full, per the process above.
- Respect the dependency graph in [`/specs/README.md`](../specs/README.md): do not start a spec whose listed dependencies have not been merged to `main`.
- Do not implement functionality that belongs to a different spec, even if it seems convenient, unless it is a hard prerequisite explicitly named in the current spec's own tasks. If you find yourself needing out-of-scope work to proceed, stop and flag it to the user rather than absorbing it into the current branch.
- Every commit must comply with the project's engineering standards as established by the relevant foundation specs (TypeScript, ESLint, Prettier, unit tests, Zod validation where applicable, Atomic Design for frontend components, CI passing, Docker-compatible configuration). A spec is not complete if it introduces code that violates standards established by an earlier, already-merged spec.
