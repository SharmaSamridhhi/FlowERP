import type { PurchaseOrderWithItems } from "@flowerp/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as apiClient from "../../lib/api-client";
import { AuthContext } from "../../lib/auth-context";
import { ToastProvider } from "../../lib/toast-context";
import PurchaseOrderDetailPage from "./PurchaseOrderDetailPage";

function renderPage(
  role: "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS",
  initialEntry = "/purchase-orders/po-1",
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          user: { id: "user-1", name: "Test User", email: "test@flowerp.test", role },
          isInitializing: false,
          login: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <ToastProvider>
          <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
              <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
              <Route path="/purchase-orders/:id/edit" element={<p>Edit PO page</p>} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

function buildPO(overrides: Partial<PurchaseOrderWithItems> = {}): PurchaseOrderWithItems {
  return {
    id: "po-1",
    poNumber: "PO-2026-000001",
    supplierName: "Acme Wholesale",
    status: "DRAFT",
    totalQuantity: 5,
    totalCost: 50,
    createdById: "user-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    items: [
      {
        id: "item-1",
        productId: "prod-1",
        productNameSnapshot: "Steel Bolt",
        productSkuSnapshot: "BOLT-001",
        unitCost: 10,
        quantity: 5,
      },
    ],
    ...overrides,
  };
}

describe("PurchaseOrderDetailPage", () => {
  it("renders PO fields and line items", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({ data: buildPO() });

    renderPage("ADMIN");

    await waitFor(() => expect(screen.getByText("PO-2026-000001")).toBeInTheDocument());
    expect(screen.getByText("Acme Wholesale")).toBeInTheDocument();
    expect(screen.getByText("Steel Bolt")).toBeInTheDocument();
    expect(screen.getByText("BOLT-001")).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("shows Edit/Receive/Cancel enabled for a Draft when the role can manage POs", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({ data: buildPO({ status: "DRAFT" }) });

    renderPage("WAREHOUSE");

    await waitFor(() => expect(screen.getByText("PO-2026-000001")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Edit" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Receive" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancel PO" })).toBeEnabled();

    vi.restoreAllMocks();
  });

  it("shows only Cancel for a Received PO — Edit/Receive aren't valid in that state for anyone", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({ data: buildPO({ status: "RECEIVED" }) });

    renderPage("ADMIN");

    await waitFor(() => expect(screen.getByText("PO-2026-000001")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Receive" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel PO" })).toBeEnabled();

    vi.restoreAllMocks();
  });

  it("shows no management actions for a Cancelled PO — none are valid in that state for anyone", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({ data: buildPO({ status: "CANCELLED" }) });

    renderPage("ADMIN");

    await waitFor(() => expect(screen.getByText("PO-2026-000001")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Receive" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel PO" })).not.toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it.each(["SALES", "ACCOUNTS"] as const)(
    "shows Edit/Receive/Cancel as disabled (not hidden) for %s on a Draft PO, with an explanation",
    async (role) => {
      vi.spyOn(apiClient, "apiRequest").mockResolvedValue({ data: buildPO({ status: "DRAFT" }) });

      renderPage(role);

      await waitFor(() => expect(screen.getByText("PO-2026-000001")).toBeInTheDocument());
      const editButton = screen.getByRole("button", { name: "Edit" });
      const receiveButton = screen.getByRole("button", { name: "Receive" });
      const cancelButton = screen.getByRole("button", { name: "Cancel PO" });

      expect(editButton).toBeDisabled();
      expect(receiveButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
      expect(editButton).toHaveAttribute("title", "Only Admin and Warehouse can do this.");

      vi.restoreAllMocks();
    },
  );

  it("requires confirmation before cancelling, and reverses stock on a Received PO", async () => {
    const spy = vi.spyOn(apiClient, "apiRequest").mockImplementation((path, options) => {
      if (options?.method === "POST" && path.includes("/cancel")) {
        return Promise.resolve({ data: buildPO({ status: "CANCELLED" }) });
      }
      return Promise.resolve({ data: buildPO({ status: "RECEIVED" }) });
    });

    renderPage("ADMIN");

    await waitFor(() => expect(screen.getByText("PO-2026-000001")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Cancel PO" }));

    expect(screen.getByText(/cancelling it will reverse its stock increase/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Yes, Cancel PO" }));

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        "/purchase-orders/po-1/cancel",
        expect.objectContaining({ method: "POST" }),
      ),
    );

    vi.restoreAllMocks();
  });

  it("shows the negative-stock block detail when cancel fails with 409", async () => {
    vi.spyOn(apiClient, "apiRequest").mockImplementation((path, options) => {
      if (options?.method === "POST" && path.includes("/cancel")) {
        return Promise.reject(
          new apiClient.ApiError(
            409,
            "CONFLICT",
            "Cannot cancel: reversing this receipt would take stock negative for: Steel Bolt",
            [
              {
                productId: "prod-1",
                productName: "Steel Bolt",
                requestedQuantity: 5,
                availableQuantity: 2,
              },
            ],
          ),
        );
      }
      return Promise.resolve({ data: buildPO({ status: "RECEIVED" }) });
    });

    renderPage("WAREHOUSE");

    await waitFor(() => expect(screen.getByText("PO-2026-000001")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Cancel PO" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, Cancel PO" }));

    await waitFor(() =>
      expect(
        screen.getByText(/Cannot cancel — reversing this receipt would take stock negative/),
      ).toBeInTheDocument(),
    );
    const alerts = screen.getAllByRole("alert");
    const blockedAlert = alerts.find((el) => el.textContent?.includes("Cannot cancel"));
    expect(blockedAlert?.textContent).toContain("Steel Bolt: only 2 in stock (this PO added 5)");

    vi.restoreAllMocks();
  });

  it("renders an error message when the PO fails to load", async () => {
    vi.spyOn(apiClient, "apiRequest").mockRejectedValue(
      new apiClient.ApiError(404, "NOT_FOUND", "Purchase order not found"),
    );

    renderPage("ADMIN");

    expect(await screen.findByRole("alert")).toHaveTextContent("Purchase order not found");

    vi.restoreAllMocks();
  });
});
