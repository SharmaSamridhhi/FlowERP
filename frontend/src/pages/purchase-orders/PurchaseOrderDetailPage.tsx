import type { InsufficientStockItem, PurchaseOrderStatus } from "@flowerp/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  cancelPurchaseOrder,
  getPurchaseOrder,
  receivePurchaseOrder,
} from "../../api/purchase-orders";
import { Badge, Button } from "../../components/atoms";
import { Modal } from "../../components/molecules";
import { ApiError } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { canWrite, writeDeniedTitle } from "../../lib/permissions";
import { useToast } from "../../lib/toast-context";

const STATUS_BADGE_VARIANT: Record<PurchaseOrderStatus, "neutral" | "success" | "danger"> = {
  DRAFT: "neutral",
  RECEIVED: "success",
  CANCELLED: "danger",
};

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value ?? "—"}</dd>
    </div>
  );
}

function formatCurrency(value: number): string {
  return value.toFixed(2);
}

function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [blockedItems, setBlockedItems] = useState<InsufficientStockItem[]>([]);

  const poQuery = useQuery({
    queryKey: ["purchase-orders", id],
    queryFn: () => getPurchaseOrder(id!),
  });

  const receiveMutation = useMutation({
    mutationFn: () => receivePurchaseOrder(id!),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["purchase-orders", id] }),
        queryClient.invalidateQueries({ queryKey: ["purchase-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ]);
      showToast("success", "Purchase order received.");
    },
    onError: (err) => {
      showToast(
        "error",
        err instanceof ApiError ? err.message : "Could not receive purchase order.",
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelPurchaseOrder(id!),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["purchase-orders", id] }),
        queryClient.invalidateQueries({ queryKey: ["purchase-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ]);
      setIsCancelModalOpen(false);
      setBlockedItems([]);
      showToast("success", "Purchase order cancelled.");
    },
    onError: (err) => {
      setIsCancelModalOpen(false);
      if (err instanceof ApiError && err.code === "CONFLICT" && Array.isArray(err.details)) {
        setBlockedItems(err.details as InsufficientStockItem[]);
        showToast("error", "Cancelling would take stock negative — see below.");
      } else {
        showToast(
          "error",
          err instanceof ApiError ? err.message : "Could not cancel purchase order.",
        );
      }
    },
  });

  if (poQuery.isPending) {
    return <p className="text-sm text-slate-500">Loading purchase order...</p>;
  }

  if (poQuery.isError) {
    return (
      <p role="alert" className="text-sm text-red-600">
        {poQuery.error instanceof ApiError
          ? poQuery.error.message
          : "Could not load purchase order."}
      </p>
    );
  }

  const po = poQuery.data.data;
  const canManage = canWrite(user?.role, "purchaseOrders");
  const deniedTitle = writeDeniedTitle("purchaseOrders");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{po.poNumber}</h1>
          <p className="text-sm text-slate-500">{po.supplierName}</p>
        </div>
        <div className="flex gap-2">
          {po.status === "DRAFT" && (
            <>
              <Button
                variant="secondary"
                onClick={() => navigate(`/purchase-orders/${po.id}/edit`)}
                disabled={!canManage}
                title={canManage ? undefined : deniedTitle}
              >
                Edit
              </Button>
              <Button
                isLoading={receiveMutation.isPending}
                onClick={() => receiveMutation.mutate()}
                disabled={!canManage}
                title={canManage ? undefined : deniedTitle}
              >
                Receive
              </Button>
            </>
          )}
          {po.status !== "CANCELLED" && (
            <Button
              variant="secondary"
              onClick={() => setIsCancelModalOpen(true)}
              disabled={!canManage}
              title={canManage ? undefined : deniedTitle}
            >
              Cancel PO
            </Button>
          )}
        </div>
      </div>

      {blockedItems.length > 0 && (
        <div role="alert" className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">
            Cannot cancel — reversing this receipt would take stock negative:
          </p>
          <ul className="mt-1 list-disc pl-5 text-sm text-red-700">
            {blockedItems.map((item) => (
              <li key={item.productId}>
                {item.productName}: only {item.availableQuantity} in stock (this PO added{" "}
                {item.requestedQuantity})
              </li>
            ))}
          </ul>
        </div>
      )}

      <dl className="grid grid-cols-1 gap-6 rounded-md bg-white p-6 shadow sm:grid-cols-2">
        <DetailField
          label="Status"
          value={<Badge variant={STATUS_BADGE_VARIANT[po.status]}>{po.status}</Badge>}
        />
        <DetailField label="Total quantity" value={po.totalQuantity} />
        <DetailField label="Total cost" value={formatCurrency(po.totalCost)} />
        <DetailField label="Created" value={new Date(po.createdAt).toLocaleString()} />
        <DetailField label="Last updated" value={new Date(po.updatedAt).toLocaleString()} />
      </dl>

      <section className="rounded-md bg-white p-6 shadow">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Line Items</h2>
        <table className="min-w-full divide-y divide-slate-200">
          <thead>
            <tr className="text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <th className="py-2">Product</th>
              <th className="py-2">Unit Cost</th>
              <th className="py-2">Quantity</th>
              <th className="py-2">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {po.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2">
                  <p className="text-sm text-slate-900">{item.productNameSnapshot}</p>
                  <p className="text-xs text-slate-500">{item.productSkuSnapshot}</p>
                </td>
                <td className="py-2 text-sm text-slate-700">{formatCurrency(item.unitCost)}</td>
                <td className="py-2 text-sm text-slate-700">{item.quantity}</td>
                <td className="py-2 text-sm text-slate-700">
                  {formatCurrency(item.unitCost * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel this purchase order?"
      >
        <p className="text-sm text-slate-700">
          {po.status === "RECEIVED"
            ? "This purchase order is Received — cancelling it will reverse its stock increase (a compensating stock-out movement for every line item). If any of that stock has already been used elsewhere, cancellation will be blocked."
            : "This draft purchase order will be cancelled."}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setIsCancelModalOpen(false)}>
            Keep PO
          </Button>
          <Button isLoading={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>
            Yes, Cancel PO
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default PurchaseOrderDetailPage;
