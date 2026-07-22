import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { PackageBoxLogoIcon } from "../atoms/icons";
import { BrandCredit } from "../molecules/BrandCredit";

export interface NavItem {
  label: string;
  to: string;
  /** If omitted, visible to every role. Real role-gating logic lands in FLO-011. */
  roles?: string[];
  icon?: ReactNode;
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
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-5 pt-5 pb-4">
        <span className="bg-brand-500 text-brand-50 flex h-9 w-9 items-center justify-center rounded-lg">
          <PackageBoxLogoIcon className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <p className="text-brand-800 text-lg font-bold">FlowERP</p>
          <p className="text-xs text-slate-400">Distribution Hub</p>
        </div>
      </div>
      <nav aria-label="Main navigation" className="flex flex-col gap-1 px-3">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md border-l-[3px] px-3 py-2 text-sm font-medium ${
                isActive
                  ? "bg-brand-50 border-brand-500 text-brand-800"
                  : "border-transparent text-slate-600 hover:bg-slate-50"
              }`
            }
          >
            {item.icon && <span className="h-4.5 w-4.5 shrink-0">{item.icon}</span>}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-slate-100 px-5 py-3">
        <BrandCredit />
      </div>
    </aside>
  );
}
