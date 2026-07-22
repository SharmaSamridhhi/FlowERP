import type { Product } from "@flowerp/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { listProducts } from "../../api/products";
import { Badge, Button, Select } from "../../components/atoms";
import { Pagination, SearchBar } from "../../components/molecules";
import { DataTable } from "../../components/organisms";
import type { DataTableColumn } from "../../components/organisms";
import { useAuth } from "../../lib/auth-context";
import { canWrite, writeDeniedTitle } from "../../lib/permissions";

const LOW_STOCK_FILTER_OPTIONS = [
  { value: "", label: "All products" },
  { value: "true", label: "Low stock only" },
];

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

// Search/filter/page state lives in the URL, mirroring
// CustomersListPage.tsx (specs/FLO-012-customer-crm.md) — see that file
// for the rationale.
function ProductsListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canAdd = canWrite(user?.role, "products");
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get("page") ?? "1");
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const lowStock = searchParams.get("lowStock") ?? "";

  const [searchInput, setSearchInput] = useState(search);
  const [lastSyncedSearch, setLastSyncedSearch] = useState(search);
  if (search !== lastSyncedSearch) {
    setLastSyncedSearch(search);
    setSearchInput(search);
  }

  const [categoryInput, setCategoryInput] = useState(category);
  const [lastSyncedCategory, setLastSyncedCategory] = useState(category);
  if (category !== lastSyncedCategory) {
    setLastSyncedCategory(category);
    setCategoryInput(category);
  }

  useEffect(() => {
    if (searchInput === search && categoryInput === category) {
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
        if (categoryInput) {
          next.set("category", categoryInput);
        } else {
          next.delete("category");
        }
        next.set("page", "1");
        return next;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput, search, categoryInput, category, setSearchParams]);

  function updateLowStock(value: string) {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (value) {
        next.set("lowStock", value);
      } else {
        next.delete("lowStock");
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
    queryKey: ["products", { page, search, category, lowStock }],
    queryFn: () =>
      listProducts({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        category: category || undefined,
        lowStock: lowStock ? lowStock === "true" : undefined,
      }),
  });

  const columns: DataTableColumn<Product>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Name",
        render: (product) => (
          <Link
            to={`/products/${product.id}`}
            className="text-brand-700 font-medium hover:underline"
          >
            {product.name}
          </Link>
        ),
      },
      { key: "sku", header: "SKU", render: (p) => p.sku },
      { key: "category", header: "Category", render: (p) => p.category },
      {
        key: "unitPrice",
        header: "Unit Price",
        render: (p) => p.unitPrice.toFixed(2),
      },
      {
        key: "currentStock",
        header: "Stock",
        render: (p) => (
          <span className="flex items-center gap-2">
            {p.currentStock}
            {p.isLowStock && <Badge variant="warning">Low stock</Badge>}
          </span>
        ),
      },
      { key: "location", header: "Location", render: (p) => p.location ?? "—" },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Products</h1>
        <Button
          onClick={() => navigate("/products/new")}
          disabled={!canAdd}
          title={canAdd ? undefined : writeDeniedTitle("products")}
        >
          Add Product
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-60 flex-1">
          <SearchBar
            aria-label="Search products"
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search by name or SKU..."
          />
        </div>
        <div className="w-48">
          <SearchBar
            aria-label="Filter by category"
            value={categoryInput}
            onChange={setCategoryInput}
            placeholder="Filter by category..."
          />
        </div>
        <div className="w-48">
          <Select
            aria-label="Filter by stock level"
            options={LOW_STOCK_FILTER_OPTIONS}
            value={lowStock}
            onChange={(event) => updateLowStock(event.target.value)}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        getRowKey={(p) => p.id}
        isLoading={query.isPending}
        emptyMessage="No products found."
      />

      {query.data?.meta?.pagination && (
        <Pagination meta={query.data.meta.pagination} onPageChange={goToPage} />
      )}
    </div>
  );
}

export default ProductsListPage;
