import type { SalesChallanStatus } from "@flowerp/shared";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getDashboardStats } from "../api/dashboard";
import { Badge, Button } from "../components/atoms";
import {
  AlertIcon,
  BoxIcon,
  DownloadIcon,
  TrendingUpIcon,
  UsersIcon,
} from "../components/atoms/icons";
import { SparkLineChart, StatCard } from "../components/molecules";

const CHALLAN_STATUS_VARIANT: Record<SalesChallanStatus, "neutral" | "success" | "danger"> = {
  DRAFT: "neutral",
  CONFIRMED: "success",
  CANCELLED: "danger",
};

function formatMoney(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}k`;
  }
  return `$${value.toFixed(0)}`;
}

function exportTodaysChallansCsv(
  rows: { challanNumber: string; customerName: string; totalAmount: number; status: string }[],
) {
  const header = ["Challan #", "Customer", "Amount", "Status"];
  const lines = rows.map((r) =>
    [r.challanNumber, r.customerName, r.totalAmount.toFixed(2), r.status]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "todays-challans.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function HomePage() {
  const statsQuery = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: getDashboardStats,
  });
  const stats = statsQuery.data?.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Real-time summary of your warehouse and sales activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => stats && exportTodaysChallansCsv(stats.todaysChallans)}
            disabled={!stats || stats.todaysChallans.length === 0}
          >
            <DownloadIcon className="h-4 w-4" />
            Export Data
          </Button>
          <Button onClick={() => window.print()}>Generate Report</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Inventory Value"
          icon={<BoxIcon className="h-4 w-4" />}
          value={statsQuery.isPending ? "—" : formatMoney(stats!.totalInventoryValue)}
        />
        <StatCard
          label="Monthly Confirmed Sales"
          icon={<TrendingUpIcon className="h-4 w-4" />}
          value={statsQuery.isPending ? "—" : formatMoney(stats!.monthlyConfirmedSales)}
        />
        <StatCard
          label="Total Active Customers"
          icon={<UsersIcon className="h-4 w-4" />}
          value={statsQuery.isPending ? "—" : stats!.totalActiveCustomers}
        />
        <StatCard
          label="Low Stock Alerts"
          icon={<AlertIcon className="h-4 w-4" />}
          value={statsQuery.isPending ? "—" : stats!.lowStockAlertCount}
          trailing={
            stats && stats.lowStockAlertCount > 0 ? (
              <Badge variant="danger">Critical</Badge>
            ) : undefined
          }
        />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Sales Performance</h2>
            <p className="text-sm text-slate-500">Revenue trend over the last 30 days</p>
          </div>
          <span className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600">
            Last 30 Days
          </span>
        </div>
        {stats && stats.salesTrend.length > 0 ? (
          <SparkLineChart
            points={stats.salesTrend.map((p) => ({ date: p.date, value: p.revenue }))}
          />
        ) : (
          <p className="py-12 text-center text-sm text-slate-400">
            {statsQuery.isPending ? "Loading…" : "No confirmed sales in this window yet."}
          </p>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Today's Challans Summary</h2>
          <Badge variant="info">{stats?.todaysChallans.length ?? 0} Total</Badge>
        </div>

        {stats && stats.todaysChallans.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {stats.todaysChallans.map((challan) => (
              <li key={challan.id} className="flex items-center justify-between py-3">
                <div>
                  <Link
                    to={`/challans/${challan.id}`}
                    className="text-brand-700 font-medium hover:underline"
                  >
                    {challan.challanNumber}
                  </Link>
                  <p className="text-xs text-slate-500">{challan.customerName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-700">
                    ${challan.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  <Badge variant={CHALLAN_STATUS_VARIANT[challan.status]}>{challan.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-slate-400">
            {statsQuery.isPending ? "Loading…" : "No challans created today yet."}
          </p>
        )}

        <div className="mt-4 border-t border-slate-100 pt-4 text-center">
          <Link to="/challans" className="text-brand-700 text-sm font-medium hover:underline">
            View All Challans
          </Link>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
