import type { InsufficientStockItem, SalesChallanStatus } from "@flowerp/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCustomer } from "../../api/customers";
import { cancelChallan, confirmChallan, getChallan } from "../../api/sales-challans";
import { Badge, Button } from "../../components/atoms";
import { PackageBoxLogoIcon } from "../../components/atoms/icons";
import { Modal } from "../../components/molecules";
import { ApiError } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { canWrite, writeDeniedTitle } from "../../lib/permissions";
import { useToast } from "../../lib/toast-context";

const STATUS_BADGE_VARIANT: Record<SalesChallanStatus, "neutral" | "success" | "danger"> = {
  DRAFT: "neutral",
  CONFIRMED: "success",
  CANCELLED: "danger",
};

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
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
  const challan = challanQuery.data?.data;

  // Fills in the "Billed & Dispatched To" block with the customer's real
  // contact details — the challan response only carries customerName.
  const customerQuery = useQuery({
    queryKey: ["customers", challan?.customerId],
    queryFn: () => getCustomer(challan!.customerId),
    enabled: Boolean(challan?.customerId),
  });
  const customer = customerQuery.data?.data;

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

  if (challanQuery.isError || !challan) {
    return (
      <p role="alert" className="text-sm text-red-600">
        {challanQuery.error instanceof ApiError
          ? challanQuery.error.message
          : "Could not load challan."}
      </p>
    );
  }

  const canManage = canWrite(user?.role, "challans");
  const deniedTitle = writeDeniedTitle("challans");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-slate-900">{challan.challanNumber}</h1>
          <Badge variant={STATUS_BADGE_VARIANT[challan.status]}>{challan.status}</Badge>
        </div>
        <div className="flex gap-2">
          {challan.status === "DRAFT" && (
            <>
              <Button
                variant="secondary"
                onClick={() => navigate(`/challans/${challan.id}/edit`)}
                disabled={!canManage}
                title={canManage ? undefined : deniedTitle}
              >
                Edit
              </Button>
              <Button
                isLoading={confirmMutation.isPending}
                onClick={() => confirmMutation.mutate()}
                disabled={!canManage}
                title={canManage ? undefined : deniedTitle}
              >
                Confirm
              </Button>
            </>
          )}
          {challan.status !== "CANCELLED" && (
            <Button
              variant="secondary"
              onClick={() => setIsCancelModalOpen(true)}
              disabled={!canManage}
              title={canManage ? undefined : deniedTitle}
            >
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

      {/* Formal document view — everything below is read-only presentation
          of the same challan data rendered above the fold; no vehicle
          number / e-way bill / tax fields since none exist in the model. */}
      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between border-b border-slate-100 pb-6">
          <div className="flex items-center gap-3">
            <span className="bg-brand-500 text-brand-50 flex h-11 w-11 items-center justify-center rounded-lg">
              <PackageBoxLogoIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-brand-800 text-lg font-bold">FlowERP</p>
              <p className="text-xs text-slate-500">Distribution Hub</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold tracking-wide text-slate-900 uppercase">
              Delivery Challan
            </p>
            <p className="text-xs text-slate-500">Original for Consignee</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 border-b border-slate-100 py-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Billed &amp; Dispatched To
            </p>
            <p className="font-medium text-slate-900">
              {customer?.businessName ?? challan.customerName}
            </p>
            {customer && (
              <div className="mt-1 text-sm text-slate-600">
                {customer.address && <p>{customer.address}</p>}
                {customer.mobile && <p>Contact: {customer.mobile}</p>}
                {customer.email && <p>Email: {customer.email}</p>}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:justify-items-end sm:text-right">
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Challan Date
              </p>
              <p className="text-sm text-slate-900">
                {new Date(challan.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Last Updated
              </p>
              <p className="text-sm text-slate-900">
                {new Date(challan.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <table className="min-w-full divide-y divide-slate-200">
          <thead>
            <tr className="text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <th className="py-2">Product Description &amp; SKU</th>
              <th className="py-2 text-right">Quantity</th>
              <th className="py-2 text-right">Unit Price</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {challan.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2.5">
                  <p className="text-sm text-slate-900">{item.productNameSnapshot}</p>
                  <p className="text-xs text-slate-500">
                    SKU: <span>{item.productSkuSnapshot}</span>
                  </p>
                </td>
                <td className="py-2.5 text-right text-sm text-slate-700">{item.quantity}</td>
                <td className="py-2.5 text-right text-sm text-slate-700">
                  {formatCurrency(item.unitPriceSnapshot)}
                </td>
                <td className="py-2.5 text-right text-sm font-medium text-slate-900">
                  {formatCurrency(item.unitPriceSnapshot * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end border-t border-slate-100 pt-4">
          <div className="w-56 space-y-1">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Total Qty</span>
              <span>{challan.totalQuantity}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900">
              <span>Grand Total</span>
              <span>{formatCurrency(challan.totalAmount)}</span>
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-8 text-center">
          <div>
            <div className="mb-1 border-t border-dashed border-slate-300 pt-2 text-xs text-slate-500">
              Receiver's Signature (Name &amp; Seal)
            </div>
          </div>
          <div>
            <div className="mb-1 border-t border-dashed border-slate-300 pt-2 text-xs text-slate-500">
              Authorized Signatory
            </div>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          This is a computer generated document.
        </p>
      </div>

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
