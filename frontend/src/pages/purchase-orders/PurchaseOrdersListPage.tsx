import type { PurchaseOrder, PurchaseOrderStatus } from "@flowerp/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { listPurchaseOrders } from "../../api/purchase-orders";
import { Badge, Button, Select } from "../../components/atoms";
import { Pagination, SearchBar } from "../../components/molecules";
import { DataTable } from "../../components/organisms";
import type { DataTableColumn } from "../../components/organisms";

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "RECEIVED", label: "Received" },
  { value: "CANCELLED", label: "Cancelled" },
];

const STATUS_BADGE_VARIANT: Record<PurchaseOrderStatus, "neutral" | "success" | "danger"> = {
  DRAFT: "neutral",
  RECEIVED: "success",
  CANCELLED: "danger",
};

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

// Search/filter/page state lives in the URL, mirroring
// ChallansListPage.tsx (specs/FLO-016). No customer filter here — a PO
// has no customer relation; `search` already matches both PO number and
// supplier name server-side.
function PurchaseOrdersListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get("page") ?? "1");
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";

  const [searchInput, setSearchInput] = useState(search);
  const [lastSyncedSearch, setLastSyncedSearch] = useState(search);
  if (search !== lastSyncedSearch) {
    setLastSyncedSearch(search);
    setSearchInput(search);
  }

  useEffect(() => {
    if (searchInput === search) {
      return;
    }
    const handle = setTimeout(() => {
      setSearchParams((params) => {
        const next = new URLSearchParams(params);
        if (searchInput) {
          next.set("search", searchInput);
        } else {
          next.delete("search");
        }
        next.set("page", "1");
        return next;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput, search, setSearchParams]);

  function updateStatus(value: string) {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (value) {
        next.set("status", value);
      } else {
        next.delete("status");
      }
      next.set("page", "1");
      return next;
    });
  }

  function goToPage(nextPage: number) {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.set("page", String(nextPage));
      return next;
    });
  }

  const query = useQuery({
    queryKey: ["purchase-orders", { page, search, status }],
    queryFn: () =>
      listPurchaseOrders({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: (status || undefined) as PurchaseOrderStatus | undefined,
      }),
  });

  const columns: DataTableColumn<PurchaseOrder>[] = useMemo(
    () => [
      {
        key: "poNumber",
        header: "PO #",
        render: (po) => (
          <Link
            to={`/purchase-orders/${po.id}`}
            className="text-brand-700 font-medium hover:underline"
          >
            {po.poNumber}
          </Link>
        ),
      },
      { key: "supplierName", header: "Supplier", render: (po) => po.supplierName },
      {
        key: "status",
        header: "Status",
        render: (po) => <Badge variant={STATUS_BADGE_VARIANT[po.status]}>{po.status}</Badge>,
      },
      { key: "totalQuantity", header: "Total Qty", render: (po) => po.totalQuantity },
      {
        key: "totalCost",
        header: "Total Cost",
        render: (po) => po.totalCost.toFixed(2),
      },
      {
        key: "createdAt",
        header: "Created",
        render: (po) => new Date(po.createdAt).toLocaleDateString(),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Purchase Orders</h1>
        <Button onClick={() => navigate("/purchase-orders/new")}>New Purchase Order</Button>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-60 flex-1">
          <SearchBar
            aria-label="Search purchase orders"
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search by PO number or supplier..."
          />
        </div>
        <div className="w-44">
          <Select
            aria-label="Filter by status"
            options={STATUS_FILTER_OPTIONS}
            value={status}
            onChange={(event) => updateStatus(event.target.value)}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        getRowKey={(po) => po.id}
        isLoading={query.isPending}
        emptyMessage="No purchase orders found."
      />

      {query.data?.meta?.pagination && (
        <Pagination meta={query.data.meta.pagination} onPageChange={goToPage} />
      )}
    </div>
  );
}

export default PurchaseOrdersListPage;
