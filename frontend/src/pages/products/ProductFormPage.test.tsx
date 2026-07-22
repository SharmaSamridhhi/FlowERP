import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as apiClient from "../../lib/api-client";
import { ToastProvider } from "../../lib/toast-context";
import ProductFormPage from "./ProductFormPage";

function renderPage(initialEntry = "/products/new") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/products/new" element={<ProductFormPage />} />
            <Route path="/products/:id/edit" element={<ProductFormPage />} />
            <Route path="/products/:id" element={<p>Product detail page</p>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe("ProductFormPage", () => {
  it("shows validation errors and does not submit when required fields are missing", async () => {
    const apiRequestSpy = vi.spyOn(apiClient, "apiRequest");

    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Create product" }));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("SKU is required")).toBeInTheDocument();
    expect(screen.getByText("Category is required")).toBeInTheDocument();
    expect(apiRequestSpy).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it("rejects a negative unit price client-side", async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText(/^Name/), "Steel Bolt");
    await userEvent.type(screen.getByLabelText(/^SKU/), "BOLT-001");
    await userEvent.type(screen.getByLabelText(/^Category/), "Hardware");
    fireEvent.change(screen.getByLabelText(/^Unit price/), { target: { value: "-5" } });
    await userEvent.click(screen.getByRole("button", { name: "Create product" }));

    expect(await screen.findByText("Unit price must be 0 or more")).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("creates a product and navigates to its detail page on success", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: { id: "prod-1", name: "Steel Bolt" },
    });

    renderPage();

    await userEvent.type(screen.getByLabelText(/^Name/), "Steel Bolt");
    await userEvent.type(screen.getByLabelText(/^SKU/), "BOLT-001");
    await userEvent.type(screen.getByLabelText(/^Category/), "Hardware");
    await userEvent.type(screen.getByLabelText(/^Unit price/), "4.5");
    await userEvent.type(screen.getByLabelText(/^Minimum stock alert quantity/), "10");
    await userEvent.click(screen.getByRole("button", { name: "Create product" }));

    await waitFor(() => expect(screen.getByText("Product detail page")).toBeInTheDocument());
    expect(apiClient.apiRequest).toHaveBeenCalledWith(
      "/products",
      expect.objectContaining({ method: "POST" }),
    );

    vi.restoreAllMocks();
  });

  it("shows an inline server error and stays on the page when the request fails", async () => {
    vi.spyOn(apiClient, "apiRequest").mockRejectedValue(
      new apiClient.ApiError(409, "CONFLICT", "A record with this sku already exists."),
    );

    renderPage();

    await userEvent.type(screen.getByLabelText(/^Name/), "Steel Bolt");
    await userEvent.type(screen.getByLabelText(/^SKU/), "BOLT-001");
    await userEvent.type(screen.getByLabelText(/^Category/), "Hardware");
    await userEvent.type(screen.getByLabelText(/^Unit price/), "4.5");
    await userEvent.type(screen.getByLabelText(/^Minimum stock alert quantity/), "10");
    await userEvent.click(screen.getByRole("button", { name: "Create product" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A record with this sku already exists.",
    );

    vi.restoreAllMocks();
  });

  it("prefills the form with existing product data when editing, with SKU locked", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: {
        id: "prod-1",
        name: "Steel Bolt",
        sku: "BOLT-001",
        category: "Hardware",
        unitPrice: 4.5,
        currentStock: 50,
        minStockAlertQuantity: 10,
        location: "Warehouse A",
        isLowStock: false,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    });

    renderPage("/products/prod-1/edit");

    expect(await screen.findByDisplayValue("Steel Bolt")).toBeInTheDocument();
    expect(screen.getByDisplayValue("BOLT-001")).toBeInTheDocument();
    expect(screen.getByLabelText(/^SKU/)).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("rejects an image over 5MB client-side", async () => {
    renderPage();

    const oversized = new File([new Uint8Array(6 * 1024 * 1024)], "product.png", {
      type: "image/png",
    });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, oversized);

    expect(await screen.findByText("Image must be 5MB or smaller.")).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("shows a preview once a valid image is selected", async () => {
    const objectUrl = "blob:mock-preview-url";
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn().mockReturnValue(objectUrl),
      revokeObjectURL: vi.fn(),
    });

    renderPage();

    const file = new File(["fake-image-bytes"], "product.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    expect(await screen.findByRole("img", { name: "Product" })).toHaveAttribute("src", objectUrl);

    vi.unstubAllGlobals();
  });
});
