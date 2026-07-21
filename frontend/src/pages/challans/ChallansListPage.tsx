import type { SalesChallan, SalesChallanStatus } from "@flowerp/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getCustomer, listCustomers } from "../../api/customers";
import { listChallans } from "../../api/sales-challans";
import { Badge, Button, Select } from "../../components/atoms";
import { Pagination, SearchBar, SearchSelect } from "../../components/molecules";
import { DataTable } from "../../components/organisms";
import type { DataTableColumn } from "../../components/organisms";

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const STATUS_BADGE_VARIANT: Record<SalesChallanStatus, "neutral" | "success" | "danger"> = {
  DRAFT: "neutral",
  CONFIRMED: "success",
  CANCELLED: "danger",
};

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

// Search/filter/page state lives in the URL, mirroring
// CustomersListPage.tsx/ProductsListPage.tsx (specs/FLO-012/013).
function ChallansListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get("page") ?? "1");
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const customerId = searchParams.get("customerId") ?? "";

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

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerLabel, setCustomerLabel] = useState("");

  // Resolves a customerId already present in the URL (e.g. a shared link)
  // back to a display name, since the URL only stores the id. Adjusted
  // during render (not in an effect) when the fetched name doesn't match
  // what's already shown — see React's guidance:
  // https://react.dev/learn/you-might-not-need-an-effect
  const resolvedCustomerQuery = useQuery({
    queryKey: ["customers", customerId],
    queryFn: () => getCustomer(customerId),
    enabled: Boolean(customerId) && !customerLabel,
  });
  const resolvedCustomer = resolvedCustomerQuery.data?.data;
  if (resolvedCustomer && resolvedCustomer.name !== customerLabel) {
    setCustomerLabel(resolvedCustomer.name);
  }

  const customerSearchQuery = useQuery({
    queryKey: ["customers", "search", customerQuery],
    queryFn: () => listCustomers({ page: 1, limit: 10, search: customerQuery }),
    enabled: customerQuery.length > 0,
  });

  function selectCustomerFilter(id: string, label: string) {
    setCustomerLabel(label);
    setCustomerQuery("");
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.set("customerId", id);
      next.set("page", "1");
      return next;
    });
  }

  function clearCustomerFilter() {
    setCustomerLabel("");
    setCustomerQuery("");
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.delete("customerId");
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
    queryKey: ["challans", { page, search, status, customerId }],
    queryFn: () =>
      listChallans({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: (status || undefined) as SalesChallanStatus | undefined,
        customerId: customerId || undefined,
      }),
  });

  const columns: DataTableColumn<SalesChallan>[] = useMemo(
    () => [
      {
        key: "challanNumber",
        header: "Challan #",
        render: (challan) => (
          <Link
            to={`/challans/${challan.id}`}
            className="text-brand-700 font-medium hover:underline"
          >
            {challan.challanNumber}
          </Link>
        ),
      },
      { key: "customerName", header: "Customer", render: (c) => c.customerName },
      {
        key: "status",
        header: "Status",
        render: (c) => <Badge variant={STATUS_BADGE_VARIANT[c.status]}>{c.status}</Badge>,
      },
      { key: "totalQuantity", header: "Total Qty", render: (c) => c.totalQuantity },
      {
        key: "createdAt",
        header: "Created",
        render: (c) => new Date(c.createdAt).toLocaleDateString(),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Sales Challans</h1>
        <Button onClick={() => navigate("/challans/new")}>New Challan</Button>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-60 flex-1">
          <SearchBar
            aria-label="Search challans"
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search by challan number..."
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
        <div className="w-64">
          {customerLabel ? (
            <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
              <span className="flex-1 truncate">{customerLabel}</span>
              <button
                type="button"
                onClick={clearCustomerFilter}
                aria-label="Clear customer filter"
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
          ) : (
            <SearchSelect
              aria-label="Filter by customer"
              placeholder="Filter by customer..."
              query={customerQuery}
              onQueryChange={setCustomerQuery}
              isLoading={customerSearchQuery.isFetching}
              options={(customerSearchQuery.data?.data ?? []).map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              onSelect={(option) => selectCustomerFilter(option.value, option.label)}
            />
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        getRowKey={(c) => c.id}
        isLoading={query.isPending}
        emptyMessage="No sales challans found."
      />

      {query.data?.meta?.pagination && (
        <Pagination meta={query.data.meta.pagination} onPageChange={goToPage} />
      )}
    </div>
  );
}

export default ChallansListPage;
