import type { InsufficientStockItem, SalesChallanStatus } from "@flowerp/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cancelChallan, confirmChallan, getChallan } from "../../api/sales-challans";
import { Badge, Button } from "../../components/atoms";
import { Modal } from "../../components/molecules";
import { ApiError } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { useToast } from "../../lib/toast-context";

const STATUS_BADGE_VARIANT: Record<SalesChallanStatus, "neutral" | "success" | "danger"> = {
  DRAFT: "neutral",
  CONFIRMED: "success",
  CANCELLED: "danger",
};

// Roles permitted to create/edit/confirm/cancel a challan (see
// specs/FLO-015-sales-challan-backend.md's role matrix).
const CAN_MANAGE_CHALLAN_ROLES = new Set(["ADMIN", "SALES"]);

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

function ChallanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [insufficientItems, setInsufficientItems] = useState<InsufficientStockItem[]>([]);

  const challanQuery = useQuery({
    queryKey: ["challans", id],
    queryFn: () => getChallan(id!),
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmChallan(id!),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["challans", id] }),
        queryClient.invalidateQueries({ queryKey: ["challans"] }),
      ]);
      setInsufficientItems([]);
      showToast("success", "Challan confirmed.");
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "CONFLICT" && Array.isArray(err.details)) {
        setInsufficientItems(err.details as InsufficientStockItem[]);
        showToast("error", "Some products don't have enough stock.");
      } else {
        showToast("error", err instanceof ApiError ? err.message : "Could not confirm challan.");
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelChallan(id!),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["challans", id] }),
        queryClient.invalidateQueries({ queryKey: ["challans"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ]);
      setIsCancelModalOpen(false);
      showToast("success", "Challan cancelled.");
    },
    onError: (err) => {
      setIsCancelModalOpen(false);
      showToast("error", err instanceof ApiError ? err.message : "Could not cancel challan.");
    },
  });

  if (challanQuery.isPending) {
    return <p className="text-sm text-slate-500">Loading challan...</p>;
  }

  if (challanQuery.isError) {
    return (
      <p role="alert" className="text-sm text-red-600">
        {challanQuery.error instanceof ApiError
          ? challanQuery.error.message
          : "Could not load challan."}
      </p>
    );
  }

  const challan = challanQuery.data.data;
  const canManage = Boolean(user?.role && CAN_MANAGE_CHALLAN_ROLES.has(user.role));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{challan.challanNumber}</h1>
          <p className="text-sm text-slate-500">{challan.customerName}</p>
        </div>
        <div className="flex gap-2">
          {canManage && challan.status === "DRAFT" && (
            <>
              <Button variant="secondary" onClick={() => navigate(`/challans/${challan.id}/edit`)}>
                Edit
              </Button>
              <Button
                isLoading={confirmMutation.isPending}
                onClick={() => confirmMutation.mutate()}
              >
                Confirm
              </Button>
            </>
          )}
          {canManage && challan.status !== "CANCELLED" && (
            <Button variant="secondary" onClick={() => setIsCancelModalOpen(true)}>
              Cancel Challan
            </Button>
          )}
        </div>
      </div>

      {insufficientItems.length > 0 && (
        <div role="alert" className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Insufficient stock:</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-red-700">
            {insufficientItems.map((item) => (
              <li key={item.productId}>
                {item.productName}: only {item.availableQuantity} available (requested{" "}
                {item.requestedQuantity})
              </li>
            ))}
          </ul>
        </div>
      )}

      <dl className="grid grid-cols-1 gap-6 rounded-md bg-white p-6 shadow sm:grid-cols-2">
        <DetailField
          label="Status"
          value={<Badge variant={STATUS_BADGE_VARIANT[challan.status]}>{challan.status}</Badge>}
        />
        <DetailField label="Total quantity" value={challan.totalQuantity} />
        <DetailField label="Created" value={new Date(challan.createdAt).toLocaleString()} />
        <DetailField label="Last updated" value={new Date(challan.updatedAt).toLocaleString()} />
      </dl>

      <section className="rounded-md bg-white p-6 shadow">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Line Items</h2>
        <table className="min-w-full divide-y divide-slate-200">
          <thead>
            <tr className="text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <th className="py-2">Product</th>
              <th className="py-2">Unit Price</th>
              <th className="py-2">Quantity</th>
              <th className="py-2">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {challan.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2">
                  <p className="text-sm text-slate-900">{item.productNameSnapshot}</p>
                  <p className="text-xs text-slate-500">{item.productSkuSnapshot}</p>
                </td>
                <td className="py-2 text-sm text-slate-700">
                  {formatCurrency(item.unitPriceSnapshot)}
                </td>
                <td className="py-2 text-sm text-slate-700">{item.quantity}</td>
                <td className="py-2 text-sm text-slate-700">
                  {formatCurrency(item.unitPriceSnapshot * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel this challan?"
      >
        <p className="text-sm text-slate-700">
          {challan.status === "CONFIRMED"
            ? "This challan is Confirmed — cancelling it will reverse its stock deduction (a compensating stock-in movement for every line item)."
            : "This draft challan will be cancelled."}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setIsCancelModalOpen(false)}>
            Keep Challan
          </Button>
          <Button isLoading={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>
            Yes, Cancel Challan
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default ChallanDetailPage;
