import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "./DataTable";
import type { DataTableColumn } from "./DataTable";

interface Row {
  id: number;
  name: string;
}

const COLUMNS: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", sortable: true, render: (row) => row.name },
];

const ROWS: Row[] = [
  { id: 1, name: "Acme Distribution" },
  { id: 2, name: "Bright Traders" },
];

describe("DataTable", () => {
  it("renders a loading state instead of rows", () => {
    render(<DataTable columns={COLUMNS} data={[]} getRowKey={(row) => row.id} isLoading />);

    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByText("Acme Distribution")).not.toBeInTheDocument();
  });

  it("renders an empty state when there is no data", () => {
    render(<DataTable columns={COLUMNS} data={[]} getRowKey={(row) => row.id} />);

    expect(screen.getByText("No results found.")).toBeInTheDocument();
  });

  it("renders a custom empty message when provided", () => {
    render(
      <DataTable
        columns={COLUMNS}
        data={[]}
        getRowKey={(row) => row.id}
        emptyMessage="No customers yet."
      />,
    );

    expect(screen.getByText("No customers yet.")).toBeInTheDocument();
  });

  it("renders populated rows", () => {
    render(<DataTable columns={COLUMNS} data={ROWS} getRowKey={(row) => row.id} />);

    expect(screen.getByText("Acme Distribution")).toBeInTheDocument();
    expect(screen.getByText("Bright Traders")).toBeInTheDocument();
  });

  it("calls onSortChange with the column key when a sortable header is clicked", async () => {
    const onSortChange = vi.fn();
    render(
      <DataTable
        columns={COLUMNS}
        data={ROWS}
        getRowKey={(row) => row.id}
        onSortChange={onSortChange}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Name" }));

    expect(onSortChange).toHaveBeenCalledWith("name");
  });

  it("indicates the active sort column and direction", () => {
    render(
      <DataTable
        columns={COLUMNS}
        data={ROWS}
        getRowKey={(row) => row.id}
        sortKey="name"
        sortDirection="asc"
      />,
    );

    expect(screen.getByRole("columnheader")).toHaveAttribute("aria-sort", "ascending");
  });
});
