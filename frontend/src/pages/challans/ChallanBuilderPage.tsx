import type { InsufficientStockItem } from "@flowerp/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listCustomers } from "../../api/customers";
import { listProducts } from "../../api/products";
import {
  confirmChallan as confirmChallanApi,
  createChallan,
  getChallan,
  updateChallan,
} from "../../api/sales-challans";
import { Button, Input } from "../../components/atoms";
import { SearchSelect } from "../../components/molecules";
import { ApiError } from "../../lib/api-client";
import { useToast } from "../../lib/toast-context";
import { useLineItems } from "./useLineItems";

function formatCurrency(value: number): string {
  return value.toFixed(2);
}

// Used for both create (/challans/new) and edit-while-Draft
// (/challans/:id/edit). A Confirmed/Cancelled challan is never editable —
// findChallanQuery's effect redirects to the read-only detail view instead
// (specs/FLO-016-sales-challan-frontend.md's acceptance criteria).
function ChallanBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerLabel, setCustomerLabel] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [insufficientByProductId, setInsufficientByProductId] = useState<
    Record<string, InsufficientStockItem>
  >({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const lineItems = useLineItems();

  const existingChallanQuery = useQuery({
    queryKey: ["challans", id],
    queryFn: () => getChallan(id!),
    enabled: isEditing,
  });

  // Redirecting away is a genuine side effect (imperative navigation), so
  // it stays in an effect; loading the fetched draft into local state does
  // not (see below).
  useEffect(() => {
    const challan = existingChallanQuery.data?.data;
    if (challan && challan.status !== "DRAFT") {
      navigate(`/challans/${challan.id}`, { replace: true });
    }
  }, [existingChallanQuery.data, navigate]);

  // Adjusting state during render (not inside an effect) when the fetched
  // draft doesn't match what's already loaded — mirrors
  // CustomersListPage.tsx's search-input resync and React's own guidance:
  // https://react.dev/learn/you-might-not-need-an-effect
  const [loadedChallanId, setLoadedChallanId] = useState<string | null>(null);
  const fetchedChallan = existingChallanQuery.data?.data;
  if (
    fetchedChallan &&
    fetchedChallan.status === "DRAFT" &&
    fetchedChallan.id !== loadedChallanId
  ) {
    setLoadedChallanId(fetchedChallan.id);
    setCustomerId(fetchedChallan.customerId);
    setCustomerLabel(fetchedChallan.customerName);
    lineItems.reset(
      fetchedChallan.items.map((item) => ({
        productId: item.productId,
        productName: item.productNameSnapshot,
        productSku: item.productSkuSnapshot,
        unitPrice: item.unitPriceSnapshot,
        quantity: item.quantity,
      })),
    );
  }

  const customerSearchQuery = useQuery({
    queryKey: ["customers", "search", customerQuery],
    queryFn: () => listCustomers({ page: 1, limit: 10, search: customerQuery }),
    enabled: customerQuery.length > 0,
  });

  const productSearchQuery = useQuery({
    queryKey: ["products", "search", productQuery],
    queryFn: () => listProducts({ page: 1, limit: 10, search: productQuery, lowStock: undefined }),
    enabled: productQuery.length > 0,
  });

  function handleQuantityChange(productId: string, value: string) {
    lineItems.setQuantity(productId, Number(value));
    setInsufficientByProductId((current) => {
      if (!(productId in current)) {
        return current;
      }
      const next = { ...current };
      delete next[productId];
      return next;
    });
  }

  function handleRemoveItem(productId: string) {
    lineItems.removeItem(productId);
    setInsufficientByProductId((current) => {
      if (!(productId in current)) {
        return current;
      }
      const next = { ...current };
      delete next[productId];
      return next;
    });
  }

  async function handleSave(thenConfirm: boolean) {
    if (!customerId) {
      setServerError("Select a customer.");
      return;
    }
    if (lineItems.items.length === 0) {
      setServerError("Add at least one product.");
      return;
    }

    setServerError(null);
    setInsufficientByProductId({});
    setIsSaving(true);

    const payload = {
      customerId,
      items: lineItems.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    };

    try {
      const response = isEditing ? await updateChallan(id!, payload) : await createChallan(payload);
      await queryClient.invalidateQueries({ queryKey: ["challans"] });

      if (!thenConfirm) {
        showToast("success", isEditing ? "Challan updated." : "Challan saved as draft.");
        navigate(`/challans/${response.data.id}`);
        return;
      }

      try {
        await confirmChallanApi(response.data.id);
        await queryClient.invalidateQueries({ queryKey: ["challans"] });
        showToast("success", "Challan confirmed.");
        navigate(`/challans/${response.data.id}`);
      } catch (err) {
        if (err instanceof ApiError && err.code === "CONFLICT" && Array.isArray(err.details)) {
          const map: Record<string, InsufficientStockItem> = {};
          for (const detail of err.details as InsufficientStockItem[]) {
            map[detail.productId] = detail;
          }
          setInsufficientByProductId(map);
          showToast("error", "Saved as draft — some products don't have enough stock.");
          if (!isEditing) {
            navigate(`/challans/${response.data.id}/edit`, { replace: true });
          }
        } else {
          showToast("error", err instanceof ApiError ? err.message : "Could not confirm challan.");
        }
      }
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isEditing && existingChallanQuery.isPending) {
    return <p className="text-sm text-slate-500">Loading challan...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-slate-900">
        {isEditing ? "Edit Challan" : "New Challan"}
      </h1>

      <div className="rounded-md bg-white p-6 shadow">
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="customer-select">
          Customer
        </label>
        {customerLabel ? (
          <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
            <span className="flex-1">{customerLabel}</span>
            <button
              type="button"
              onClick={() => {
                setCustomerId(null);
                setCustomerLabel("");
              }}
              className="text-brand-700 text-xs font-medium hover:underline"
            >
              Change
            </button>
          </div>
        ) : (
          <SearchSelect
            aria-label="Customer"
            placeholder="Search customers by name, mobile..."
            query={customerQuery}
            onQueryChange={setCustomerQuery}
            isLoading={customerSearchQuery.isFetching}
            options={(customerSearchQuery.data?.data ?? []).map((c) => ({
              value: c.id,
              label: c.name,
              hint: c.mobile,
            }))}
            onSelect={(option) => {
              setCustomerId(option.value);
              setCustomerLabel(option.label);
              setCustomerQuery("");
            }}
          />
        )}
      </div>

      <div className="rounded-md bg-white p-6 shadow">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Line Items</h2>

        <div className="mb-4 max-w-md">
          <SearchSelect
            aria-label="Add product"
            placeholder="Search products by name or SKU..."
            query={productQuery}
            onQueryChange={setProductQuery}
            isLoading={productSearchQuery.isFetching}
            options={(productSearchQuery.data?.data ?? []).map((p) => ({
              value: p.id,
              label: p.name,
              hint: p.sku,
            }))}
            onSelect={(option) => {
              const product = productSearchQuery.data?.data.find((p) => p.id === option.value);
              if (product) {
                lineItems.addItem(
                  {
                    id: product.id,
                    name: product.name,
                    sku: product.sku,
                    unitPrice: product.unitPrice,
                  },
                  1,
                );
              }
              setProductQuery("");
            }}
          />
        </div>

        {lineItems.items.length === 0 ? (
          <p className="text-sm text-slate-500">No products added yet.</p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <th className="py-2">Product</th>
                <th className="py-2">Unit Price</th>
                <th className="py-2">Quantity</th>
                <th className="py-2">Line Total</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lineItems.items.map((item) => {
                const insufficient = insufficientByProductId[item.productId];
                return (
                  <tr key={item.productId}>
                    <td className="py-2">
                      <p className="text-sm text-slate-900">{item.productName}</p>
                      <p className="text-xs text-slate-500">{item.productSku}</p>
                      {insufficient && (
                        <p role="alert" className="mt-1 text-xs text-red-600">
                          Only {insufficient.availableQuantity} available (requested{" "}
                          {insufficient.requestedQuantity})
                        </p>
                      )}
                    </td>
                    <td className="py-2 text-sm text-slate-700">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="py-2">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        aria-label={`Quantity for ${item.productName}`}
                        hasError={Boolean(insufficient)}
                        onChange={(event) =>
                          handleQuantityChange(item.productId, event.target.value)
                        }
                        className="w-20"
                      />
                    </td>
                    <td className="py-2 text-sm text-slate-700">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.productId)}
                        aria-label={`Remove ${item.productName}`}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="mt-4 flex justify-end gap-6 text-sm text-slate-700">
          <p>
            Total quantity: <span className="font-semibold">{lineItems.totalQuantity}</span>
          </p>
          <p>
            Total value:{" "}
            <span className="font-semibold">{formatCurrency(lineItems.totalValue)}</span>
          </p>
        </div>
      </div>

      {serverError && (
        <p role="alert" className="text-sm text-red-600">
          {serverError}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          isLoading={isSaving}
          onClick={() => handleSave(false)}
        >
          Save as Draft
        </Button>
        <Button type="button" isLoading={isSaving} onClick={() => handleSave(true)}>
          Confirm
        </Button>
      </div>
    </div>
  );
}

export default ChallanBuilderPage;
