import { NavLink } from "react-router-dom";

export interface NavItem {
  label: string;
  to: string;
  /** If omitted, visible to every role. Real role-gating logic lands in FLO-011. */
  roles?: string[];
}

export interface AppSidebarProps {
  role: string | null;
  navItems: NavItem[];
  onNavigate?: () => void;
}

export function AppSidebar({ role, navItems, onNavigate }: AppSidebarProps) {
  const visibleItems = navItems.filter(
    (item) => !item.roles || (role !== null && item.roles.includes(role)),
  );

  return (
    <aside className="flex h-full w-56 flex-col border-r border-slate-200 bg-white">
      <nav aria-label="Main navigation" className="flex flex-col gap-1 p-4">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `rounded-md px-3 py-2 text-sm font-medium ${
                isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
