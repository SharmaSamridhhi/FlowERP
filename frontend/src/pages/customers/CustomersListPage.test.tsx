import type { Customer } from "@flowerp/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as apiClient from "../../lib/api-client";
import CustomersListPage from "./CustomersListPage";

function renderPage(initialEntry = "/customers") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/customers" element={<CustomersListPage />} />
          <Route path="/customers/new" element={<p>Add customer page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const CUSTOMER: Customer = {
  id: "cust-1",
  name: "Acme Distribution",
  mobile: "9800000001",
  email: null,
  businessName: "Acme Pvt Ltd",
  gstNumber: null,
  type: "WHOLESALE",
  address: null,
  status: "ACTIVE",
  followUpDate: null,
  notes: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("CustomersListPage", () => {
  it("renders customers returned by the list query", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: [CUSTOMER],
      meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText("Acme Distribution")).toBeInTheDocument());
    expect(screen.getByText("Acme Pvt Ltd")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 1 (1 total)")).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("shows the empty message when no customers match", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: [],
      meta: { pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText("No customers found.")).toBeInTheDocument());

    vi.restoreAllMocks();
  });

  it("writes the search input into the URL as a query param", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: [],
      meta: { pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    });

    renderPage();

    await userEvent.type(screen.getByLabelText("Search customers"), "acme");

    await waitFor(() => {
      const call = vi
        .mocked(apiClient.apiRequest)
        .mock.calls.find(
          ([, options]) => (options as { query?: { search?: string } })?.query?.search,
        );
      expect(call).toBeDefined();
    });

    vi.restoreAllMocks();
  });

  it("navigates to the add-customer page", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: [],
      meta: { pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    });

    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Add Customer" }));

    await waitFor(() => expect(screen.getByText("Add customer page")).toBeInTheDocument());

    vi.restoreAllMocks();
  });
});
