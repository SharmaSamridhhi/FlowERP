import type { DashboardChallanSummary, DashboardStats, SalesTrendPoint } from "@flowerp/shared";
import { prisma } from "../lib/prisma.js";

const TREND_DAYS = 30;

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function getTotalInventoryValue(): Promise<number> {
  const [row] = await prisma.$queryRaw<
    { value: number }[]
  >`SELECT COALESCE(SUM("unitPrice" * "currentStock"), 0)::float8 AS value FROM products`;
  return row?.value ?? 0;
}

async function getLowStockAlertCount(): Promise<number> {
  const [row] = await prisma.$queryRaw<
    { count: number }[]
  >`SELECT COUNT(*)::int AS count FROM products WHERE "currentStock" <= "minStockAlertQuantity"`;
  return row?.count ?? 0;
}

async function getMonthlyConfirmedSales(monthStart: Date): Promise<number> {
  const [row] = await prisma.$queryRaw<{ value: number }[]>`
    SELECT COALESCE(SUM(sci."unitPriceSnapshot" * sci.quantity), 0)::float8 AS value
    FROM sales_challan_items sci
    JOIN sales_challans sc ON sc.id = sci."challanId"
    WHERE sc.status = 'CONFIRMED' AND sc."createdAt" >= ${monthStart}
  `;
  return row?.value ?? 0;
}

async function getSalesTrend(since: Date): Promise<SalesTrendPoint[]> {
  const rows = await prisma.$queryRaw<{ day: Date; revenue: number }[]>`
    SELECT DATE(sc."createdAt") AS day, SUM(sci."unitPriceSnapshot" * sci.quantity)::float8 AS revenue
    FROM sales_challans sc
    JOIN sales_challan_items sci ON sci."challanId" = sc.id
    WHERE sc.status = 'CONFIRMED' AND sc."createdAt" >= ${since}
    GROUP BY DATE(sc."createdAt")
    ORDER BY day
  `;
  const revenueByDay = new Map(rows.map((row) => [toDateKey(new Date(row.day)), row.revenue]));

  // Zero-fill every day in the window so the chart is a continuous series,
  // not just the days that happened to have a confirmed sale.
  const points: SalesTrendPoint[] = [];
  for (let i = TREND_DAYS - 1; i >= 0; i -= 1) {
    const day = new Date(since);
    day.setDate(day.getDate() + (TREND_DAYS - 1 - i));
    const key = toDateKey(day);
    points.push({ date: key, revenue: revenueByDay.get(key) ?? 0 });
  }
  return points;
}

async function getTodaysChallans(todayStart: Date): Promise<DashboardChallanSummary[]> {
  const challans = await prisma.salesChallan.findMany({
    where: { createdAt: { gte: todayStart } },
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { name: true } }, items: true },
  });

  return challans.map((challan) => ({
    id: challan.id,
    challanNumber: challan.challanNumber,
    customerName: challan.customer.name,
    totalAmount: challan.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPriceSnapshot.toNumber(),
      0,
    ),
    status: challan.status,
    createdAt: challan.createdAt.toISOString(),
  }));
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStart = startOfDay(now);
  const trendStart = new Date(todayStart);
  trendStart.setDate(trendStart.getDate() - (TREND_DAYS - 1));

  const [
    totalInventoryValue,
    lowStockAlertCount,
    monthlyConfirmedSales,
    totalActiveCustomers,
    salesTrend,
    todaysChallans,
  ] = await Promise.all([
    getTotalInventoryValue(),
    getLowStockAlertCount(),
    getMonthlyConfirmedSales(monthStart),
    prisma.customer.count({ where: { status: "ACTIVE" } }),
    getSalesTrend(trendStart),
    getTodaysChallans(todayStart),
  ]);

  return {
    totalInventoryValue,
    monthlyConfirmedSales,
    totalActiveCustomers,
    lowStockAlertCount,
    salesTrend,
    todaysChallans,
  };
}
