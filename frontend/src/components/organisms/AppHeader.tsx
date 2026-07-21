import type { ReactNode } from "react";
import { Button } from "../atoms/Button";

export interface AppHeaderProps {
  userName?: string;
  onLogout?: () => void;
  /** Leading slot — used by AppShellTemplate for the mobile nav toggle. */
  children?: ReactNode;
}

export function AppHeader({ userName, onLogout, children }: AppHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-2">{children}</div>
      <div className="flex items-center gap-3">
        {userName && <span className="text-sm text-slate-600">{userName}</span>}
        {onLogout && (
          <Button variant="ghost" size="sm" onClick={onLogout}>
            Log out
          </Button>
        )}
      </div>
    </header>
  );
}
