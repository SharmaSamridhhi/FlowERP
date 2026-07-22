import type { StockMovementType } from "@flowerp/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listProducts } from "../api/products";
import { createStockMovement, listAllStockMovements } from "../api/stock-movements";
import { Badge, Button, Input, Select } from "../components/atoms";
import { DownloadIcon, PlusIcon } from "../components/atoms/icons";
import { FormField, Modal, Pagination, SearchSelect, StatCard } from "../components/molecules";
import { DataTable } from "../components/organisms";
import type { DataTableColumn } from "../components/organisms";
import { canWrite, writeDeniedTitle } from "../lib/permissions";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../lib/toast-context";

type StockMovementRow = Awaited<ReturnType<typeof listAllStockMovements>>["data"][number];

const TYPE_FILTER_OPTIONS = [
  { value: "", label: "All types" },
  { value: "IN", label: "IN" },
  { value: "OUT", label: "OUT" },
];

const PAGE_SIZE = 20;

function ManualAdjustmentModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [productQuery, setProductQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<{ value: string; label: string } | null>(
    null,
  );
  const [type, setType] = useState<StockMovementType>("IN");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const productSearchQuery = useQuery({
    queryKey: ["products", "search", productQuery],
    queryFn: () => listProducts({ page: 1, limit: 10, search: productQuery, lowStock: undefined }),
    enabled: productQuery.length > 0,
  });

  const mutation = useMutation({
    mutationFn: () =>
      createStockMovement(selectedProduct!.value, { quantity: Number(quantity), type, reason }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["stock-movements", "all"] });
      showToast("success", "Stock movement recorded.");
      onClose();
    },
    onError: () => showToast("error", "Could not record the stock movement."),
  });

  const canSubmit = Boolean(selectedProduct) && Number(quantity) > 0 && reason.trim().length > 0;

  return (
    <Modal isOpen onClose={onClose} title="Manual Stock Adjustment">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
        className="flex flex-col gap-4"
      >
        <FormField label="Product" htmlFor="product">
          {selectedProduct ? (
            <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
              <span className="flex-1 truncate">{selectedProduct.label}</span>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                aria-label="Clear product"
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
          ) : (
            <SearchSelect
              aria-label="Product"
              placeholder="Search products by name or SKU..."
              query={productQuery}
              onQueryChange={setProductQuery}
              isLoading={productSearchQuery.isFetching}
              options={(productSearchQuery.data?.data ?? []).map((p) => ({
                value: p.id,
                label: `${p.name} (${p.sku})`,
              }))}
              onSelect={(option) => {
                setSelectedProduct(option);
                setProductQuery("");
              }}
            />
          )}
        </FormField>
        <FormField label="Movement Type" htmlFor="type">
          <Select
            options={[
              { value: "IN", label: "IN — add stock" },
              { value: "OUT", label: "OUT — remove stock" },
            ]}
            value={type}
            onChange={(event) => setType(event.target.value as StockMovementType)}
          />
        </FormField>
        <FormField label="Quantity" htmlFor="quantity">
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </FormField>
        <FormField label="Reason" htmlFor="reason">
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. damaged goods, stock count correction"
          />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit} isLoading={mutation.isPending}>
            Record movement
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function StockMovementsPage() {
  const { user } = useAuth();
  const canAdjust = canWrite(user?.role, "products");
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const movementsQuery = useQuery({
    queryKey: ["stock-movements", "all", { page, type }],
    queryFn: () =>
      listAllStockMovements({
        page,
        limit: PAGE_SIZE,
        type: (type || undefined) as StockMovementType | undefined,
      }),
  });

  const inStockQuery = useQuery({
    queryKey: ["products", "count", "in_stock"],
    queryFn: () =>
      listProducts({ page: 1, limit: 1, lowStock: undefined, stockStatus: "in_stock" }),
  });
  const lowStockQuery = useQuery({
    queryKey: ["products", "count", "low_stock"],
    queryFn: () => listProducts({ page: 1, limit: 1, lowStock: true }),
  });

  const columns: DataTableColumn<StockMovementRow>[] = useMemo(
    () => [
      {
        key: "type",
        header: "Type",
        render: (m) => (
          <Badge variant={m.type === "IN" ? "success" : "warning"}>
            {m.type === "IN" ? "↙ IN" : "↗ OUT"}
          </Badge>
        ),
      },
      {
        key: "product",
        header: "Product & SKU",
        render: (m) => (
          <div>
            <p className="text-slate-900">{m.productName}</p>
            <p className="text-xs text-slate-500">SKU: {m.productSku}</p>
          </div>
        ),
      },
      {
        key: "quantity",
        header: "Quantity",
        render: (m) => (
          <span className={m.type === "IN" ? "text-green-600" : "text-red-600"}>
            {m.type === "IN" ? "+" : "-"}
            {m.quantity}
          </span>
        ),
      },
      { key: "reason", header: "Reason", render: (m) => m.reason },
      { key: "createdByName", header: "Recorded By", render: (m) => m.createdByName },
      {
        key: "createdAt",
        header: "Timestamp",
        render: (m) => new Date(m.createdAt).toLocaleString(),
      },
    ],
    [],
  );

  function exportCsv() {
    const rows = movementsQuery.data?.data ?? [];
    const header = ["Type", "Product", "SKU", "Quantity", "Reason", "Recorded By", "Timestamp"];
    const lines = rows.map((m) =>
      [m.type, m.productName, m.productSku, m.quantity, m.reason, m.createdByName, m.createdAt]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "stock-movements.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Warehouse Movements</h1>
          <p className="text-sm text-slate-500">
            Real-time log of all stock adjustments across your catalog.
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          disabled={!canAdjust}
          title={canAdjust ? undefined : writeDeniedTitle("products")}
        >
          <PlusIcon className="h-4 w-4" />
          Manual Stock Adjustment
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="In-Stock Products"
          value={inStockQuery.data?.meta?.pagination?.total ?? "—"}
        />
        <StatCard
          label="Low-Stock Products"
          value={lowStockQuery.data?.meta?.pagination?.total ?? "—"}
        />
        <StatCard
          label="Movements Logged"
          value={movementsQuery.data?.meta?.pagination?.total ?? "—"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-base font-semibold text-slate-900">Stock Audit Log</h2>
        <div className="w-40">
          <Select
            aria-label="Filter by movement type"
            options={TYPE_FILTER_OPTIONS}
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button
          variant="secondary"
          onClick={exportCsv}
          disabled={(movementsQuery.data?.data.length ?? 0) === 0}
        >
          <DownloadIcon className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={movementsQuery.data?.data ?? []}
        getRowKey={(m) => m.id}
        isLoading={movementsQuery.isPending}
        emptyMessage="No stock movements recorded yet."
      />

      {movementsQuery.data?.meta?.pagination && (
        <Pagination meta={movementsQuery.data.meta.pagination} onPageChange={setPage} />
      )}

      {isModalOpen && <ManualAdjustmentModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}

export default StockMovementsPage;
