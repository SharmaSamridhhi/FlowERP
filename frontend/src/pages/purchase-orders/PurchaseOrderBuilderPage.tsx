import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listProducts } from "../../api/products";
import {
  createPurchaseOrder,
  getPurchaseOrder,
  receivePurchaseOrder as receivePurchaseOrderApi,
  updatePurchaseOrder,
} from "../../api/purchase-orders";
import { Button, Input } from "../../components/atoms";
import { FormField, SearchSelect } from "../../components/molecules";
import { ApiError } from "../../lib/api-client";
import { useToast } from "../../lib/toast-context";
import { usePurchaseOrderLineItems } from "./usePurchaseOrderLineItems";

function formatCurrency(value: number): string {
  return value.toFixed(2);
}

// Used for both create (/purchase-orders/new) and edit-while-Draft
// (/purchase-orders/:id/edit). A Received/Cancelled PO is never editable —
// the effect below redirects to the read-only detail view instead
// (specs/FLO-017-purchase-order.md's acceptance criteria).
function PurchaseOrderBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [supplierName, setSupplierName] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const lineItems = usePurchaseOrderLineItems();

  const existingPOQuery = useQuery({
    queryKey: ["purchase-orders", id],
    queryFn: () => getPurchaseOrder(id!),
    enabled: isEditing,
  });

  // Redirecting away is a genuine side effect (imperative navigation), so
  // it stays in an effect; loading the fetched draft into local state does
  // not (see below) — mirrors ChallanBuilderPage.tsx's pattern.
  useEffect(() => {
    const po = existingPOQuery.data?.data;
    if (po && po.status !== "DRAFT") {
      navigate(`/purchase-orders/${po.id}`, { replace: true });
    }
  }, [existingPOQuery.data, navigate]);

  // Adjusting state during render (not inside an effect) when the fetched
  // draft doesn't match what's already loaded — see React's guidance:
  // https://react.dev/learn/you-might-not-need-an-effect
  const [loadedPOId, setLoadedPOId] = useState<string | null>(null);
  const fetchedPO = existingPOQuery.data?.data;
  if (fetchedPO && fetchedPO.status === "DRAFT" && fetchedPO.id !== loadedPOId) {
    setLoadedPOId(fetchedPO.id);
    setSupplierName(fetchedPO.supplierName);
    lineItems.reset(
      fetchedPO.items.map((item) => ({
        productId: item.productId,
        productName: item.productNameSnapshot,
        productSku: item.productSkuSnapshot,
        unitCost: item.unitCost,
        quantity: item.quantity,
      })),
    );
  }

  const productSearchQuery = useQuery({
    queryKey: ["products", "search", productQuery],
    queryFn: () => listProducts({ page: 1, limit: 10, search: productQuery, lowStock: undefined }),
    enabled: productQuery.length > 0,
  });

  async function handleSave(thenReceive: boolean) {
    if (!supplierName.trim()) {
      setServerError("Enter a supplier name.");
      return;
    }
    if (lineItems.items.length === 0) {
      setServerError("Add at least one product.");
      return;
    }

    setServerError(null);
    setIsSaving(true);

    const payload = {
      supplierName: supplierName.trim(),
      items: lineItems.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
      })),
    };

    try {
      const response = isEditing
        ? await updatePurchaseOrder(id!, payload)
        : await createPurchaseOrder(payload);
      await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });

      if (!thenReceive) {
        showToast(
          "success",
          isEditing ? "Purchase order updated." : "Purchase order saved as draft.",
        );
        navigate(`/purchase-orders/${response.data.id}`);
        return;
      }

      try {
        await receivePurchaseOrderApi(response.data.id);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["purchase-orders"] }),
          queryClient.invalidateQueries({ queryKey: ["products"] }),
        ]);
        showToast("success", "Purchase order received.");
        navigate(`/purchase-orders/${response.data.id}`);
      } catch (err) {
        showToast(
          "error",
          err instanceof ApiError ? err.message : "Saved as draft, but could not mark it received.",
        );
        navigate(`/purchase-orders/${response.data.id}`, { replace: true });
      }
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isEditing && existingPOQuery.isPending) {
    return <p className="text-sm text-slate-500">Loading purchase order...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-slate-900">
        {isEditing ? "Edit Purchase Order" : "New Purchase Order"}
      </h1>

      <div className="rounded-md bg-white p-6 shadow">
        <FormField label="Supplier name" htmlFor="supplierName" required>
          <Input
            id="supplierName"
            value={supplierName}
            onChange={(event) => setSupplierName(event.target.value)}
            placeholder="e.g. Acme Wholesale Supplies"
          />
        </FormField>
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
                lineItems.addItem({ id: product.id, name: product.name, sku: product.sku }, 1, 0);
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
                <th className="py-2">Unit Cost</th>
                <th className="py-2">Quantity</th>
                <th className="py-2">Line Total</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lineItems.items.map((item) => (
                <tr key={item.productId}>
                  <td className="py-2">
                    <p className="text-sm text-slate-900">{item.productName}</p>
                    <p className="text-xs text-slate-500">{item.productSku}</p>
                  </td>
                  <td className="py-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitCost}
                      aria-label={`Unit cost for ${item.productName}`}
                      onChange={(event) =>
                        lineItems.setUnitCost(item.productId, Number(event.target.value))
                      }
                      className="w-24"
                    />
                  </td>
                  <td className="py-2">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      aria-label={`Quantity for ${item.productName}`}
                      onChange={(event) =>
                        lineItems.setQuantity(item.productId, Number(event.target.value))
                      }
                      className="w-20"
                    />
                  </td>
                  <td className="py-2 text-sm text-slate-700">
                    {formatCurrency(item.quantity * item.unitCost)}
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => lineItems.removeItem(item.productId)}
                      aria-label={`Remove ${item.productName}`}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-4 flex justify-end gap-6 text-sm text-slate-700">
          <p>
            Total quantity: <span className="font-semibold">{lineItems.totalQuantity}</span>
          </p>
          <p>
            Total cost: <span className="font-semibold">{formatCurrency(lineItems.totalCost)}</span>
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
          Save &amp; Receive
        </Button>
      </div>
    </div>
  );
}

export default PurchaseOrderBuilderPage;
