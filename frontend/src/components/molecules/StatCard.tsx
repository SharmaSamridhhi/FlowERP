import type { ReactNode } from "react";

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}

// Small metric tile used on the Dashboard and list-page summary rows.
export function StatCard({ label, value, icon, trailing, className = "" }: StatCardProps) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
        {icon && <span className="text-brand-500">{icon}</span>}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {trailing}
      </div>
    </div>
  );
}
