import type { ReactNode } from "react";
import { Spinner } from "../atoms/Spinner";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  onSortChange?: (key: string) => void;
}

// Generic, controlled table used by every Phase 3 list screen. No internal
// fetch/sort state — sorting is reported via onSortChange and the caller
// (a page, driving a real query) decides what happens next.
export function DataTable<T>({
  columns,
  data,
  getRowKey,
  isLoading = false,
  emptyMessage = "No results found.",
  sortKey,
  sortDirection,
  onSortChange,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => {
              const isSorted = sortKey === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    isSorted ? (sortDirection === "asc" ? "ascending" : "descending") : undefined
                  }
                  className={`px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase ${column.className ?? ""}`}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSortChange?.(column.key)}
                      className="inline-flex items-center gap-1 hover:text-slate-700"
                    >
                      {column.header}
                      {isSorted && (
                        <span aria-hidden="true">{sortDirection === "asc" ? "▲" : "▼"}</span>
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center">
                <Spinner label="Loading" />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={getRowKey(row)} className="hover:bg-slate-50">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 text-sm text-slate-700 ${column.className ?? ""}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
