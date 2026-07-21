import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as apiClient from "../../lib/api-client";
import { ToastProvider } from "../../lib/toast-context";
import CustomerFormPage from "./CustomerFormPage";

function renderPage(initialEntry = "/customers/new") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/customers/new" element={<CustomerFormPage />} />
            <Route path="/customers/:id/edit" element={<CustomerFormPage />} />
            <Route path="/customers/:id" element={<p>Customer detail page</p>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe("CustomerFormPage", () => {
  it("shows validation errors and does not submit when required fields are missing", async () => {
    const apiRequestSpy = vi.spyOn(apiClient, "apiRequest");

    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Create customer" }));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Mobile number is required")).toBeInTheDocument();
    expect(apiRequestSpy).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it("creates a customer and navigates to its detail page on success", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: { id: "cust-1", name: "Acme Distribution" },
    });

    renderPage();

    await userEvent.type(screen.getByLabelText(/^Name/), "Acme Distribution");
    await userEvent.type(screen.getByLabelText(/^Mobile/), "9800000001");
    await userEvent.click(screen.getByRole("button", { name: "Create customer" }));

    await waitFor(() => expect(screen.getByText("Customer detail page")).toBeInTheDocument());
    expect(apiClient.apiRequest).toHaveBeenCalledWith(
      "/customers",
      expect.objectContaining({ method: "POST" }),
    );

    vi.restoreAllMocks();
  });

  it("shows an inline server error and stays on the page when the request fails", async () => {
    vi.spyOn(apiClient, "apiRequest").mockRejectedValue(
      new apiClient.ApiError(409, "CONFLICT", "A customer with this mobile already exists"),
    );

    renderPage();

    await userEvent.type(screen.getByLabelText(/^Name/), "Acme Distribution");
    await userEvent.type(screen.getByLabelText(/^Mobile/), "9800000001");
    await userEvent.click(screen.getByRole("button", { name: "Create customer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A customer with this mobile already exists",
    );

    vi.restoreAllMocks();
  });

  it("prefills the form with existing customer data when editing", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: {
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
        followUps: [],
      },
    });

    renderPage("/customers/cust-1/edit");

    expect(await screen.findByDisplayValue("Acme Distribution")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Acme Pvt Ltd")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();

    vi.restoreAllMocks();
  });
});
