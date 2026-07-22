import { Outlet } from "react-router-dom";
import type { NavItem } from "../components/organisms";
import { AppShellTemplate } from "../components/templates";
import {
  BoxIcon,
  DocumentIcon,
  GridIcon,
  MovementsIcon,
  UsersIcon,
} from "../components/atoms/icons";
import { useAuth } from "../lib/auth-context";
import { ROLE_LABELS } from "../lib/permissions";

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/", icon: <GridIcon /> },
  { label: "Customer Management", to: "/customers", icon: <UsersIcon /> },
  { label: "Product Inventory", to: "/products", icon: <BoxIcon /> },
  { label: "Stock Movements", to: "/stock-movements", icon: <MovementsIcon /> },
  { label: "Sales Challans", to: "/challans", icon: <DocumentIcon /> },
  { label: "Purchase Orders", to: "/purchase-orders", icon: <DocumentIcon /> },
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
      roleLabel={user ? ROLE_LABELS[user.role] : undefined}
      onLogout={logout}
    >
      <Outlet />
    </AppShellTemplate>
  );
}
