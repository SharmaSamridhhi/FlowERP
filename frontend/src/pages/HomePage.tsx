import type { NavItem } from "../components/organisms";
import { AppShellTemplate } from "../components/templates";

// Stub nav items and role — real values arrive with FLO-011 (auth) and the
// Phase 3 modules whose routes these will eventually point to.
const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/" },
  { label: "Customers", to: "/customers" },
  { label: "Products", to: "/products" },
  { label: "Sales challans", to: "/challans" },
  { label: "Purchase orders", to: "/purchase-orders" },
];

function HomePage() {
  return (
    <AppShellTemplate role="ADMIN" navItems={NAV_ITEMS} userName="Demo user">
      <div className="rounded-md bg-white p-6 shadow">
        <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Home page placeholder — real dashboard content arrives with the Phase 3 modules.
        </p>
      </div>
    </AppShellTemplate>
  );
}

export default HomePage;
