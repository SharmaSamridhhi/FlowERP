import type { ReactNode } from "react";

export interface AuthLayoutTemplateProps {
  title: string;
  children: ReactNode;
}

export function AuthLayoutTemplate({ title, children }: AuthLayoutTemplateProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-xl font-semibold text-slate-900">{title}</h1>
        {children}
      </div>
    </div>
  );
}
