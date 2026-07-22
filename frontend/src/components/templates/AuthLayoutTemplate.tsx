import type { ReactNode } from "react";
import { PackageBoxLogoIcon, ShieldIcon, TrendingUpIcon } from "../atoms/icons";

export interface AuthLayoutTemplateProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

const TOP_PRODUCTS = [
  { name: "Copper Fittings XL-40", sku: "IND-4022", value: "1,240", delta: "+14%" },
  { name: "Poly-Storage Bin 20L", sku: "WH-BIN-20", value: "892", delta: "+8%" },
  { name: "Steel Fastener Set", sku: "MT-FAST-9", value: "755", delta: "Steady" },
];

// Split-screen auth shell: left = form slot (this app's actual login form),
// right = static marketing panel. The panel's "live" numbers are
// illustrative brand content, not real data — this is a public,
// pre-authentication screen, so it deliberately doesn't call the API.
export function AuthLayoutTemplate({ title, subtitle, children, footer }: AuthLayoutTemplateProps) {
  return (
    <div className="flex min-h-screen bg-white">
      <div className="flex w-full flex-col justify-center px-8 py-12 sm:px-16 lg:w-1/2 lg:px-24">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2">
            <span className="bg-brand-500 text-brand-50 flex h-10 w-10 items-center justify-center rounded-lg">
              <PackageBoxLogoIcon className="h-5.5 w-5.5" />
            </span>
            <span className="text-brand-800 text-xl font-bold">FlowERP</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-6">{footer}</div>}

          <div className="mt-10 flex items-center gap-4 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <ShieldIcon className="h-3.5 w-3.5" /> SOC2 Compliant
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldIcon className="h-3.5 w-3.5" /> 256-bit Encryption
            </span>
          </div>
        </div>
      </div>

      <div className="from-brand-500 via-brand-700 relative hidden overflow-hidden bg-gradient-to-br to-slate-800 lg:flex lg:w-1/2 lg:flex-col lg:justify-center lg:px-16">
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-10 h-80 w-80 rounded-full bg-white/5" />

        <div className="relative">
          <h2 className="text-3xl leading-tight font-bold text-white">
            The Future of
            <br />
            Distribution Logistics
          </h2>

          <div className="mt-10 rounded-xl bg-white/95 p-5 shadow-xl backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <TrendingUpIcon className="text-brand-600 h-4 w-4" />
                Top Moving Products
              </span>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                Live
              </span>
            </div>
            <ul className="divide-y divide-slate-100">
              {TOP_PRODUCTS.map((product) => (
                <li key={product.sku} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{product.name}</p>
                    <p className="text-xs text-slate-400">SKU: {product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{product.value}</p>
                    <p
                      className={
                        product.delta === "Steady"
                          ? "text-brand-600 text-xs font-medium"
                          : "text-xs font-medium text-green-600"
                      }
                    >
                      {product.delta}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4 text-center text-white">
            <div>
              <p className="text-2xl font-bold">99.9%</p>
              <p className="text-xs text-white/70">Uptime</p>
            </div>
            <div className="border-x border-white/20">
              <p className="text-2xl font-bold">24/7</p>
              <p className="text-xs text-white/70">Support</p>
            </div>
            <div>
              <p className="text-2xl font-bold">Secure</p>
              <p className="text-xs text-white/70">Encrypted</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
