import type { CustomerWithFollowUps } from "@flowerp/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as apiClient from "../../lib/api-client";
import { AuthContext } from "../../lib/auth-context";
import { ToastProvider } from "../../lib/toast-context";
import CustomerDetailPage from "./CustomerDetailPage";

function renderPage(
  role: "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS" = "ADMIN",
  initialEntry = "/customers/cust-1",
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
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/customers/:id/edit" element={<p>Edit customer page</p>} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

const CUSTOMER: CustomerWithFollowUps = {
  id: "cust-1",
  name: "Acme Distribution",
  mobile: "9800000001",
  email: "acme@example.com",
  businessName: "Acme Pvt Ltd",
  gstNumber: null,
  type: "WHOLESALE",
  address: null,
  status: "ACTIVE",
  followUpDate: null,
  notes: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  followUps: [
    {
      id: "fu-1",
      note: "First contact made",
      createdAt: "2026-01-02T00:00:00.000Z",
      authorId: "user-1",
      authorName: "Sales Rep",
    },
  ],
};

const EMPTY_CHALLANS_ENVELOPE = {
  data: [] as unknown[],
  meta: { pagination: { page: 1, limit: 1, total: 0, totalPages: 1 } },
};

// The page also queries /challans (customer detail's Total Sales / Open
// Orders tiles and recent-challans list) alongside /customers/:id — this
// mock branches on path so both call shapes get a sensible response.
function mockApiFor(customer: CustomerWithFollowUps) {
  return (path: string) => {
    if (path.startsWith("/challans")) {
      return Promise.resolve(EMPTY_CHALLANS_ENVELOPE);
    }
    return Promise.resolve({ data: customer });
  };
}

describe("CustomerDetailPage", () => {
  it("renders customer fields and follow-up history", async () => {
    vi.spyOn(apiClient, "apiRequest").mockImplementation(mockApiFor(CUSTOMER));

    renderPage();

    await waitFor(() => expect(screen.getByText("Acme Distribution")).toBeInTheDocument());
    expect(screen.getByText("acme@example.com")).toBeInTheDocument();
    expect(screen.getByText("First contact made")).toBeInTheDocument();
    expect(screen.getByText(/Sales Rep/)).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("shows the empty state when there are no follow-ups", async () => {
    vi.spyOn(apiClient, "apiRequest").mockImplementation(
      mockApiFor({ ...CUSTOMER, followUps: [] }),
    );

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("No follow-ups recorded yet.")).toBeInTheDocument(),
    );

    vi.restoreAllMocks();
  });

  it("submits a new follow-up note and refetches the detail query", async () => {
    const apiRequestSpy = vi.spyOn(apiClient, "apiRequest").mockImplementation((path, options) => {
      if (options?.method === "POST") {
        return Promise.resolve({
          data: {
            id: "fu-2",
            note: "Second contact made",
            createdAt: "2026-01-03T00:00:00.000Z",
            authorId: "user-1",
            authorName: "Sales Rep",
          },
        });
      }
      if (path.startsWith("/challans")) {
        return Promise.resolve(EMPTY_CHALLANS_ENVELOPE);
      }
      return Promise.resolve({
        data: { ...CUSTOMER, followUps: [...CUSTOMER.followUps] },
      });
    });

    renderPage();

    await waitFor(() => expect(screen.getByText("Acme Distribution")).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText("Add a follow-up note"), "Second contact made");
    await userEvent.click(screen.getByRole("button", { name: "Add follow-up" }));

    await waitFor(() =>
      expect(apiRequestSpy).toHaveBeenCalledWith(
        "/customers/cust-1/follow-ups",
        expect.objectContaining({ method: "POST" }),
      ),
    );

    vi.restoreAllMocks();
  });

  it("renders an error message when the customer fails to load", async () => {
    vi.spyOn(apiClient, "apiRequest").mockRejectedValue(
      new apiClient.ApiError(404, "NOT_FOUND", "Customer not found"),
    );

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Customer not found");

    vi.restoreAllMocks();
  });

  it("navigates to the edit page", async () => {
    vi.spyOn(apiClient, "apiRequest").mockImplementation(mockApiFor(CUSTOMER));

    renderPage();

    await waitFor(() => expect(screen.getByText("Acme Distribution")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    await waitFor(() => expect(screen.getByText("Edit customer page")).toBeInTheDocument());

    vi.restoreAllMocks();
  });

  it("disables (not hides) Edit and Add follow-up for a role that can't write customers", async () => {
    vi.spyOn(apiClient, "apiRequest").mockImplementation(mockApiFor(CUSTOMER));

    renderPage("WAREHOUSE");

    await waitFor(() => expect(screen.getByText("Acme Distribution")).toBeInTheDocument());
    const editButton = screen.getByRole("button", { name: "Edit" });
    const followUpButton = screen.getByRole("button", { name: "Add follow-up" });

    expect(editButton).toBeDisabled();
    expect(followUpButton).toBeDisabled();
    expect(editButton).toHaveAttribute("title", "Only Admin and Sales can do this.");

    vi.restoreAllMocks();
  });
});
