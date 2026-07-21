# Entity schemas

Each Phase 3 module adds its own entity's Zod schema here as it's built — `auth.schema.ts`/`user.schema.ts` from [FLO-011](../../../specs/FLO-011-auth-rbac.md), `customer.schema.ts` from [FLO-012](../../../specs/FLO-012-customer-crm.md), `product.schema.ts` from [FLO-013](../../../specs/FLO-013-product-inventory-catalog.md), and so on.

Both `@flowerp/backend` (request validation via `validateRequest`, see [FLO-007](../../../specs/FLO-007-validation-error-handling.md)) and `@flowerp/frontend` (client-side form validation) import the same schema from here — that's the whole point of it living in this package instead of being duplicated per app. See [FLO-008](../../../specs/FLO-008-shared-contracts.md) for the full rationale.
