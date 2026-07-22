import type { Role } from "@flowerp/shared";

// Mirrors each backend route file's `authorize(...)` calls exactly — see
// backend/src/routes/{customers,products,purchase-orders,sales-challans}.route.ts.
// Read access is universal (all four roles) across every module in this
// app; only write actions (create/update/confirm/cancel/receive/record
// stock movement) are role-restricted, which is what this matrix
// captures. Used both to gate routes (RequireRole) and to
// disable-with-explanation individual CTAs, so the UI reflects what the
// backend will actually allow instead of only surfacing a 403 after a
// user has already filled out a form.
export const WRITE_ROLES = {
  customers: ["ADMIN", "SALES"],
  products: ["ADMIN", "WAREHOUSE"],
  purchaseOrders: ["ADMIN", "WAREHOUSE"],
  challans: ["ADMIN", "SALES"],
} as const satisfies Record<string, readonly Role[]>;

export type WriteResource = keyof typeof WRITE_ROLES;

export function canWrite(role: Role | null | undefined, resource: WriteResource): boolean {
  return role != null && (WRITE_ROLES[resource] as readonly Role[]).includes(role);
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  SALES: "Sales",
  WAREHOUSE: "Warehouse",
  ACCOUNTS: "Accounts",
};

export function describeRoles(roles: readonly Role[]): string {
  return roles.map((role) => ROLE_LABELS[role]).join(" and ");
}

// Explains a disabled CTA — deliberately generic (not per-action text)
// so every gated button in the app reads consistently.
export function writeDeniedTitle(resource: WriteResource): string {
  return `Only ${describeRoles(WRITE_ROLES[resource])} can do this.`;
}
