import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import * as apiClient from "../../lib/api-client";
import ApiDemoPage from "./ApiDemoPage";

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("ApiDemoPage", () => {
  it("renders the health status and paginated list once both queries resolve", async () => {
    vi.spyOn(apiClient, "apiRequest").mockImplementation((path) => {
      if (path === "/health") {
        return Promise.resolve({ data: { status: "ok" } });
      }
      return Promise.resolve({
        data: [{ id: 1, name: "Demo item 1" }],
        meta: { pagination: { page: 1, limit: 5, total: 25, totalPages: 5 } },
      });
    });

    renderWithQueryClient(<ApiDemoPage />);

    await waitFor(() =>
      expect(screen.getByTestId("health-status")).toHaveTextContent("Status: ok"),
    );
    await waitFor(() => expect(screen.getByText("Demo item 1")).toBeInTheDocument());
    expect(screen.getByText(/Page 1 of 5/)).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("renders the error message when a query fails", async () => {
    vi.spyOn(apiClient, "apiRequest").mockRejectedValue(
      new apiClient.ApiError(500, "INTERNAL_ERROR", "Internal server error"),
    );

    renderWithQueryClient(<ApiDemoPage />);

    const errorMessages = await waitFor(() => screen.getAllByText("Internal server error"));
    expect(errorMessages).toHaveLength(2);

    vi.restoreAllMocks();
  });
});
