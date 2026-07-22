import type { ReactNode } from "react";
import { IconButton } from "../atoms/IconButton";
import { BellIcon, LogoutIcon, SearchIcon } from "../atoms/icons";

export interface AppHeaderProps {
  userName?: string;
  roleLabel?: string;
  onLogout?: () => void;
  /** Leading slot — used by AppShellTemplate for the mobile nav toggle. */
  children?: ReactNode;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function AppHeader({ userName, roleLabel, onLogout, children }: AppHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4">
      {children}
      <div className="relative min-w-0 flex-1 max-w-md">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search customers, orders, or stock…"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm text-slate-700 placeholder:text-slate-400 focus:border-transparent focus:ring-2 focus:ring-brand-500 focus:outline-none"
        />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <IconButton icon={<BellIcon className="h-5 w-5" />} label="Notifications" variant="ghost" />
        {userName && (
          <div className="flex items-center gap-2 pl-1">
            <span className="bg-brand-100 text-brand-800 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold">
              {initials(userName)}
            </span>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-medium text-slate-800">{userName}</p>
              {roleLabel && (
                <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
                  {roleLabel}
                </p>
              )}
            </div>
          </div>
        )}
        {onLogout && (
          <IconButton
            icon={<LogoutIcon className="h-5 w-5" />}
            label="Log out"
            variant="ghost"
            onClick={onLogout}
          />
        )}
      </div>
    </header>
  );
}
