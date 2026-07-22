import type { Product } from "@flowerp/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { listProducts } from "../../api/products";
import { Badge, Button, Select } from "../../components/atoms";
import { Pagination, ProductImage, SearchBar } from "../../components/molecules";
import { DataTable } from "../../components/organisms";
import type { DataTableColumn } from "../../components/organisms";
import { useAuth } from "../../lib/auth-context";
import { canWrite, writeDeniedTitle } from "../../lib/permissions";

const LOW_STOCK_FILTER_OPTIONS = [
  { value: "", label: "All products" },
  { value: "true", label: "Low stock only" },
];

const STOCK_STATUS_TABS: { value: "" | "in_stock" | "out_of_stock"; label: string }[] = [
  { value: "", label: "All Items" },
  { value: "in_stock", label: "In Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
];

function stockTier(product: Product): { label: string; variant: "success" | "warning" | "danger" } {
  if (!product.isLowStock) {
    return { label: "Healthy", variant: "success" };
  }
  const criticalThreshold = product.minStockAlertQuantity * 0.15;
  if (product.currentStock <= criticalThreshold) {
    return { label: "Critical", variant: "danger" };
  }
  return { label: "Low stock", variant: "warning" };
}

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

function ProductsListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canAdd = canWrite(user?.role, "products");
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get("page") ?? "1");
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const lowStock = searchParams.get("lowStock") ?? "";
  const stockStatus = (searchParams.get("stockStatus") ?? "") as "" | "in_stock" | "out_of_stock";

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

  function updateStockStatus(value: string) {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (value) {
        next.set("stockStatus", value);
      } else {
        next.delete("stockStatus");
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
    queryKey: ["products", { page, search, category, lowStock, stockStatus }],
    queryFn: () =>
      listProducts({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        category: category || undefined,
        lowStock: lowStock ? lowStock === "true" : undefined,
        stockStatus: stockStatus || undefined,
      }),
  });

  const totalSkuQuery = useQuery({
    queryKey: ["products", "count", "all"],
    queryFn: () => listProducts({ page: 1, limit: 1, lowStock: undefined }),
  });

  const columns: DataTableColumn<Product>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Product Details",
        render: (product) => (
          <div className="flex items-center gap-3">
            <ProductImage src={product.imageUrl} alt={product.name} size="sm" />
            <div>
              <Link
                to={`/products/${product.id}`}
                className="text-brand-700 font-medium hover:underline"
              >
                {product.name}
              </Link>
              <p className="text-xs text-slate-500">Min Stock: {product.minStockAlertQuantity}</p>
            </div>
          </div>
        ),
      },
      { key: "sku", header: "SKU", render: (p) => p.sku },
      { key: "category", header: "Category", render: (p) => p.category },
      {
        key: "unitPrice",
        header: "Unit Price",
        render: (p) => `$${p.unitPrice.toFixed(2)}`,
      },
      {
        key: "currentStock",
        header: "Current Stock",
        render: (p) => p.currentStock,
      },
      {
        key: "status",
        header: "Status",
        render: (p) => {
          const tier = stockTier(p);
          return <Badge variant={tier.variant}>{tier.label}</Badge>;
        },
      },
      { key: "location", header: "Location", render: (p) => p.location ?? "—" },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Inventory Catalog</h1>
          <p className="text-sm text-slate-500">
            Manage your product listings and stock thresholds.
          </p>
        </div>
        <Button
          onClick={() => navigate("/products/new")}
          disabled={!canAdd}
          title={canAdd ? undefined : writeDeniedTitle("products")}
        >
          Add New Product
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex flex-1 flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white p-4">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Stock Status
            </p>
            <div className="inline-flex rounded-md border border-slate-200 p-0.5">
              {STOCK_STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => updateStockStatus(tab.value)}
                  className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                    stockStatus === tab.value
                      ? "bg-brand-500 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="w-48">
            <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Low Stock Filter
            </p>
            <Select
              aria-label="Filter by stock level"
              options={LOW_STOCK_FILTER_OPTIONS}
              value={lowStock}
              onChange={(event) => updateLowStock(event.target.value)}
            />
          </div>
        </div>

        <div className="bg-brand-600 flex min-w-56 flex-col justify-center rounded-lg p-4 text-white">
          <p className="text-xs font-semibold tracking-wide text-white/80 uppercase">
            Total SKU Count
          </p>
          <p className="text-3xl font-bold">{totalSkuQuery.data?.meta?.pagination?.total ?? "—"}</p>
        </div>
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
