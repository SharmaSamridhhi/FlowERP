import { Outlet } from "react-router-dom";
import type { NavItem } from "../components/organisms";
import { AppShellTemplate } from "../components/templates";
import { useAuth } from "../lib/auth-context";

// Stub nav items — real per-module routes arrive as each Phase 3 module
// is built; role-based filtering already applies (see AppSidebar).
const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/" },
  { label: "Customers", to: "/customers" },
  { label: "Products", to: "/products" },
  { label: "Sales challans", to: "/challans" },
  { label: "Purchase orders", to: "/purchase-orders" },
];

// Wraps every authenticated route (mounted inside ProtectedRoute in
// App.tsx) in the app shell, filled with the real logged-in user.
export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <AppShellTemplate
      role={user?.role ?? null}
      navItems={NAV_ITEMS}
      userName={user?.name}
      onLogout={logout}
    >
      <Outlet />
    </AppShellTemplate>
  );
}
