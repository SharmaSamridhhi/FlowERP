import type { StockMovement } from "@flowerp/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listStockMovements } from "../../api/stock-movements";
import { Badge } from "../atoms/Badge";
import { Pagination } from "../molecules/Pagination";
import { DataTable } from "./DataTable";
import type { DataTableColumn } from "./DataTable";

const PAGE_SIZE = 10;

export interface StockMovementLogProps {
  productId: string;
}

// Read-only, paginated stock movement log embedded in ProductDetailPage
// (specs/FLO-014-stock-movement-ledger.md). Owns its own query/page state
// so it's a self-contained, droppable unit; a manual adjustment elsewhere
// on the page refreshes it by invalidating the ["stock-movements",
// productId] query key, not via a prop callback.
export function StockMovementLog({ productId }: StockMovementLogProps) {
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["stock-movements", productId, page],
    queryFn: () => listStockMovements(productId, { page, limit: PAGE_SIZE }),
  });

  const columns: DataTableColumn<StockMovement>[] = useMemo(
    () => [
      {
        key: "createdAt",
        header: "Date",
        render: (movement) => new Date(movement.createdAt).toLocaleString(),
      },
      {
        key: "type",
        header: "Type",
        render: (movement) => (
          <Badge variant={movement.type === "IN" ? "success" : "warning"}>{movement.type}</Badge>
        ),
      },
      { key: "quantity", header: "Quantity", render: (movement) => movement.quantity },
      { key: "reason", header: "Reason", render: (movement) => movement.reason },
      { key: "createdByName", header: "By", render: (movement) => movement.createdByName },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        getRowKey={(movement) => movement.id}
        isLoading={query.isPending}
        emptyMessage="No stock movements recorded yet."
      />

      {query.data?.meta?.pagination && (
        <Pagination meta={query.data.meta.pagination} onPageChange={setPage} />
      )}
    </div>
  );
}
