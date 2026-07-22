import type { Customer, CustomerStatus, CustomerType } from "@flowerp/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { listCustomers } from "../../api/customers";
import { Badge, Button, Select } from "../../components/atoms";
import { Pagination, SearchBar } from "../../components/molecules";
import { DataTable } from "../../components/organisms";
import type { DataTableColumn } from "../../components/organisms";
import { useAuth } from "../../lib/auth-context";
import { canWrite, writeDeniedTitle } from "../../lib/permissions";

const TYPE_FILTER_OPTIONS = [
  { value: "", label: "All types" },
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

// Search/filter/page state lives in the URL (not just component state) so
// a refresh or a shared link preserves context — see
// specs/FLO-012-customer-crm.md's acceptance criteria.
function CustomersListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canAdd = canWrite(user?.role, "customers");
  const [searchParams, setSearchParams] = useSearchParams();

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

  const columns: DataTableColumn<Customer>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Name",
        render: (customer) => (
          <Link
            to={`/customers/${customer.id}`}
            className="text-brand-700 font-medium hover:underline"
          >
            {customer.name}
          </Link>
        ),
      },
      { key: "businessName", header: "Business", render: (c) => c.businessName ?? "—" },
      { key: "mobile", header: "Mobile", render: (c) => c.mobile },
      { key: "type", header: "Type", render: (c) => <Badge variant="info">{c.type}</Badge> },
      {
        key: "status",
        header: "Status",
        render: (c) => <Badge variant={STATUS_BADGE_VARIANT[c.status]}>{c.status}</Badge>,
      },
      {
        key: "followUpDate",
        header: "Follow-up",
        render: (c) => (c.followUpDate ? new Date(c.followUpDate).toLocaleDateString() : "—"),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Customers</h1>
        <Button
          onClick={() => navigate("/customers/new")}
          disabled={!canAdd}
          title={canAdd ? undefined : writeDeniedTitle("customers")}
        >
          Add Customer
        </Button>
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
            aria-label="Filter by type"
            options={TYPE_FILTER_OPTIONS}
            value={type}
            onChange={(event) => updateFilter("type", event.target.value)}
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
