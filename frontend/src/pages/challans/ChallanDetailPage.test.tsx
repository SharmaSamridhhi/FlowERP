import type { SalesChallanWithItems } from "@flowerp/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as apiClient from "../../lib/api-client";
import { AuthContext } from "../../lib/auth-context";
import { ToastProvider } from "../../lib/toast-context";
import ChallanDetailPage from "./ChallanDetailPage";

function renderPage(
  role: "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS",
  initialEntry = "/challans/ch-1",
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          user: { id: "user-1", name: "Test User", email: "test@flowerp.test", role },
          login: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <ToastProvider>
          <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
              <Route path="/challans/:id" element={<ChallanDetailPage />} />
              <Route path="/challans/:id/edit" element={<p>Edit challan page</p>} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

function buildChallan(overrides: Partial<SalesChallanWithItems> = {}): SalesChallanWithItems {
  return {
    id: "ch-1",
    challanNumber: "CH-2026-000001",
    status: "DRAFT",
    totalQuantity: 3,
    customerId: "cust-1",
    customerName: "Acme Distribution",
    createdById: "user-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    items: [
      {
        id: "item-1",
        productId: "prod-1",
        productNameSnapshot: "Steel Bolt",
        productSkuSnapshot: "BOLT-001",
        unitPriceSnapshot: 4.5,
        quantity: 3,
      },
    ],
    ...overrides,
  };
}

describe("ChallanDetailPage", () => {
  it("renders challan fields and line items", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({ data: buildChallan() });

    renderPage("ADMIN");

    await waitFor(() => expect(screen.getByText("CH-2026-000001")).toBeInTheDocument());
    expect(screen.getByText("Acme Distribution")).toBeInTheDocument();
    expect(screen.getByText("Steel Bolt")).toBeInTheDocument();
    expect(screen.getByText("BOLT-001")).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("shows Edit/Confirm/Cancel for a Draft when the role can manage challans", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: buildChallan({ status: "DRAFT" }),
    });

    renderPage("SALES");

    await waitFor(() => expect(screen.getByText("CH-2026-000001")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel Challan" })).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("shows only Cancel for a Confirmed challan", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: buildChallan({ status: "CONFIRMED" }),
    });

    renderPage("ADMIN");

    await waitFor(() => expect(screen.getByText("CH-2026-000001")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel Challan" })).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("shows no management actions for a Cancelled challan", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: buildChallan({ status: "CANCELLED" }),
    });

    renderPage("ADMIN");

    await waitFor(() => expect(screen.getByText("CH-2026-000001")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel Challan" })).not.toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it.each(["WAREHOUSE", "ACCOUNTS"] as const)(
    "hides all management actions for %s regardless of status",
    async (role) => {
      vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
        data: buildChallan({ status: "DRAFT" }),
      });

      renderPage(role);

      await waitFor(() => expect(screen.getByText("CH-2026-000001")).toBeInTheDocument());
      expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Cancel Challan" })).not.toBeInTheDocument();

      vi.restoreAllMocks();
    },
  );

  it("requires confirmation before cancelling, and reverses stock on a Confirmed challan", async () => {
    const spy = vi.spyOn(apiClient, "apiRequest").mockImplementation((path, options) => {
      if (options?.method === "POST" && path.includes("/cancel")) {
        return Promise.resolve({ data: buildChallan({ status: "CANCELLED" }) });
      }
      return Promise.resolve({ data: buildChallan({ status: "CONFIRMED" }) });
    });

    renderPage("ADMIN");

    await waitFor(() => expect(screen.getByText("CH-2026-000001")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Cancel Challan" }));

    expect(screen.getByText(/cancelling it will reverse its stock deduction/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Yes, Cancel Challan" }));

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        "/challans/ch-1/cancel",
        expect.objectContaining({ method: "POST" }),
      ),
    );

    vi.restoreAllMocks();
  });

  it("shows the insufficient-stock detail when confirm fails with 409", async () => {
    vi.spyOn(apiClient, "apiRequest").mockImplementation((path, options) => {
      if (options?.method === "POST" && path.includes("/confirm")) {
        return Promise.reject(
          new apiClient.ApiError(409, "CONFLICT", "Insufficient stock for: Steel Bolt", [
            {
              productId: "prod-1",
              productName: "Steel Bolt",
              requestedQuantity: 3,
              availableQuantity: 1,
            },
          ]),
        );
      }
      return Promise.resolve({ data: buildChallan({ status: "DRAFT" }) });
    });

    renderPage("SALES");

    await waitFor(() => expect(screen.getByText("CH-2026-000001")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(screen.getByText("Insufficient stock:")).toBeInTheDocument());
    const alerts = screen.getAllByRole("alert");
    const insufficientAlert = alerts.find((el) => el.textContent?.includes("Insufficient stock:"));
    expect(insufficientAlert?.textContent).toContain("Steel Bolt: only 1 available (requested 3)");

    vi.restoreAllMocks();
  });

  it("renders an error message when the challan fails to load", async () => {
    vi.spyOn(apiClient, "apiRequest").mockRejectedValue(
      new apiClient.ApiError(404, "NOT_FOUND", "Sales challan not found"),
    );

    renderPage("ADMIN");

    expect(await screen.findByRole("alert")).toHaveTextContent("Sales challan not found");

    vi.restoreAllMocks();
  });
});
