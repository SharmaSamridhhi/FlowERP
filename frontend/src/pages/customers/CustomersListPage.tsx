import type { Customer, CustomerStatus, CustomerType } from "@flowerp/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { listCustomers } from "../../api/customers";
import { Badge, Button, IconButton, Select } from "../../components/atoms";
import { EyeIcon, PencilIcon } from "../../components/atoms/icons";
import { Pagination, SearchBar, StatCard } from "../../components/molecules";
import { DataTable } from "../../components/organisms";
import type { DataTableColumn } from "../../components/organisms";
import { useAuth } from "../../lib/auth-context";
import { canWrite, writeDeniedTitle } from "../../lib/permissions";

const TYPE_FILTER_OPTIONS = [
  { value: "", label: "All Customer Types" },
  { value: "RETAIL", label: "Retail" },
  { value: "WHOLESALE", label: "Wholesale" },
  { value: "DISTRIBUTOR", label: "Distributor" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "LEAD", label: "Lead" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const STATUS_BADGE_VARIANT: Record<CustomerStatus, "neutral" | "success" | "danger"> = {
  LEAD: "neutral",
  ACTIVE: "success",
  INACTIVE: "danger",
};

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function FollowUpCell({ date, now }: { date: string | null; now: number }) {
  if (!date) {
    return <span className="text-slate-400">—</span>;
  }
  const due = new Date(date);
  const diffDays = Math.floor((due.getTime() - now) / (1000 * 60 * 60 * 24));
  return (
    <div>
      <p>{due.toLocaleDateString()}</p>
      {diffDays < 0 && (
        <p className="text-xs font-medium text-red-600">
          Overdue by {Math.abs(diffDays)} day{Math.abs(diffDays) === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}

// Search/filter/page state lives in the URL (not just component state) so
// a refresh or a shared link preserves context — see
// specs/FLO-012-customer-crm.md's acceptance criteria.
function CustomersListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canAdd = canWrite(user?.role, "customers");
  const [searchParams, setSearchParams] = useSearchParams();
  // Lazy initializer, not a direct Date.now() call in the render body —
  // computed once on mount rather than on every render.
  const [now] = useState(() => Date.now());

  const page = Number(searchParams.get("page") ?? "1");
  const search = searchParams.get("search") ?? "";
  const type = searchParams.get("type") ?? "";
  const status = searchParams.get("status") ?? "";

  const [searchInput, setSearchInput] = useState(search);
  // Resync local input state when the URL's search param changes from
  // outside this input (e.g. browser back/forward) — computed during
  // render, not in an effect, per React's "adjusting state when a prop
  // changes" guidance: https://react.dev/learn/you-might-not-need-an-effect
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

  function updateFilter(key: "type" | "status", value: string) {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
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
    queryKey: ["customers", { page, search, type, status }],
    queryFn: () =>
      listCustomers({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        type: (type || undefined) as CustomerType | undefined,
        status: (status || undefined) as CustomerStatus | undefined,
      }),
  });

  // Lightweight stat tiles — each reuses the same list endpoint with
  // limit=1 and reads meta.pagination.total, so no dedicated aggregate
  // endpoint is needed for counts the existing filters already support.
  const activeCountQuery = useQuery({
    queryKey: ["customers", "count", { status: "ACTIVE" }],
    queryFn: () => listCustomers({ page: 1, limit: 1, status: "ACTIVE" }),
  });
  const overdueCountQuery = useQuery({
    queryKey: ["customers", "count", { overdue: true }],
    queryFn: () => listCustomers({ page: 1, limit: 1, overdue: true }),
  });
  const wholesaleCountQuery = useQuery({
    queryKey: ["customers", "count", { type: "WHOLESALE" }],
    queryFn: () => listCustomers({ page: 1, limit: 1, type: "WHOLESALE" }),
  });

  const columns: DataTableColumn<Customer>[] = useMemo(
    () => [
      {
        key: "contact",
        header: "Business & Contact",
        render: (customer) => (
          <div className="flex items-center gap-3">
            <span className="bg-brand-100 text-brand-800 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {initialsOf(customer.businessName ?? customer.name)}
            </span>
            <div>
              <Link
                to={`/customers/${customer.id}`}
                className="text-brand-700 font-medium hover:underline"
              >
                {customer.businessName ?? customer.name}
              </Link>
              <p className="text-xs text-slate-500">
                <span>{customer.name}</span> • <span>{customer.mobile}</span>
              </p>
            </div>
          </div>
        ),
      },
      { key: "gstNumber", header: "GST Number", render: (c) => c.gstNumber ?? "—" },
      { key: "type", header: "Type", render: (c) => <Badge variant="info">{c.type}</Badge> },
      {
        key: "followUpDate",
        header: "Next Follow-up",
        render: (c) => <FollowUpCell date={c.followUpDate} now={now} />,
      },
      {
        key: "status",
        header: "Status",
        render: (c) => <Badge variant={STATUS_BADGE_VARIANT[c.status]}>{c.status}</Badge>,
      },
      {
        key: "actions",
        header: "Actions",
        render: (c) => (
          <div className="flex items-center gap-1">
            <IconButton
              icon={<EyeIcon className="h-4 w-4" />}
              label={`View ${c.name}`}
              onClick={() => navigate(`/customers/${c.id}`)}
            />
            <IconButton
              icon={<PencilIcon className="h-4 w-4" />}
              label={`Edit ${c.name}`}
              onClick={() => navigate(`/customers/${c.id}/edit`)}
              disabled={!canAdd}
              title={canAdd ? undefined : writeDeniedTitle("customers")}
            />
          </div>
        ),
      },
    ],
    [canAdd, navigate, now],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Customer Management</h1>
        <Button
          onClick={() => navigate("/customers/new")}
          disabled={!canAdd}
          title={canAdd ? undefined : writeDeniedTitle("customers")}
        >
          Add Customer
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Active Clients"
          value={activeCountQuery.data?.meta?.pagination?.total ?? "—"}
        />
        <StatCard
          label="Pending Follow-ups"
          value={overdueCountQuery.data?.meta?.pagination?.total ?? "—"}
          trailing={
            (overdueCountQuery.data?.meta?.pagination?.total ?? 0) > 0 ? (
              <Badge variant="danger">Urgent</Badge>
            ) : undefined
          }
        />
        <StatCard
          label="Top Tier Wholesalers"
          value={wholesaleCountQuery.data?.meta?.pagination?.total ?? "—"}
        />
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Quick Filter Type
          </p>
          <Select
            aria-label="Filter by type"
            options={TYPE_FILTER_OPTIONS}
            value={type}
            onChange={(event) => updateFilter("type", event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-60 flex-1">
          <SearchBar
            aria-label="Search customers"
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search by name, mobile, email..."
          />
        </div>
        <div className="w-44">
          <Select
            aria-label="Filter by status"
            options={STATUS_FILTER_OPTIONS}
            value={status}
            onChange={(event) => updateFilter("status", event.target.value)}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        getRowKey={(c) => c.id}
        isLoading={query.isPending}
        emptyMessage="No customers found."
      />

      {query.data?.meta?.pagination && (
        <Pagination meta={query.data.meta.pagination} onPageChange={goToPage} />
      )}
    </div>
  );
}

export default CustomersListPage;
