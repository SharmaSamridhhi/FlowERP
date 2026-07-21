import { useState } from "react";
import type { ReactNode } from "react";
import { IconButton } from "../atoms/IconButton";
import { AppHeader } from "../organisms/AppHeader";
import { AppSidebar } from "../organisms/AppSidebar";
import type { NavItem } from "../organisms/AppSidebar";

export interface AppShellTemplateProps {
  role: string | null;
  navItems: NavItem[];
  userName?: string;
  onLogout?: () => void;
  children: ReactNode;
}

// Sidebar + header + content slot. AppSidebar itself is position-agnostic
// (a plain <aside>) — this template owns the responsive off-canvas
// wrapper: static/expanded at md: and above, a toggleable overlay panel
// below it.
export function AppShellTemplate({
  role,
  navItems,
  userName,
  onLogout,
  children,
}: AppShellTemplateProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:static md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AppSidebar role={role} navItems={navItems} onNavigate={() => setIsSidebarOpen(false)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader userName={userName} onLogout={onLogout}>
          <IconButton
            icon={<span aria-hidden="true">☰</span>}
            label="Toggle navigation"
            className="md:hidden"
            onClick={() => setIsSidebarOpen((open) => !open)}
          />
        </AppHeader>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
