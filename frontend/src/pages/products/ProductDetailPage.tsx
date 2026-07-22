import { CreateStockMovementSchema } from "@flowerp/shared";
import type { CreateStockMovementInput } from "@flowerp/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { getProduct } from "../../api/products";
import { createStockMovement } from "../../api/stock-movements";
import { Badge, Button, Input, Select, Textarea } from "../../components/atoms";
import { FormField, Modal } from "../../components/molecules";
import { StockMovementLog } from "../../components/organisms";
import { ApiError } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { canWrite, writeDeniedTitle } from "../../lib/permissions";
import { useToast } from "../../lib/toast-context";

const MOVEMENT_TYPE_OPTIONS = [
  { value: "IN", label: "IN" },
  { value: "OUT", label: "OUT" },
];

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value ?? "—"}</dd>
    </div>
  );
}

function StockAdjustmentModal({
  productId,
  isOpen,
  onClose,
}: {
  productId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(CreateStockMovementSchema),
    defaultValues: { quantity: 1, type: "IN" as const, reason: "" },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateStockMovementInput) => createStockMovement(productId, data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["stock-movements", productId] }),
        queryClient.invalidateQueries({ queryKey: ["products", productId] }),
      ]);
      showToast("success", "Stock movement recorded.");
      reset({ quantity: 1, type: "IN", reason: "" });
      onClose();
    },
    onError: (err) => {
      showToast(
        "error",
        err instanceof ApiError ? err.message : "Could not record the stock movement.",
      );
    },
  });

  const onSubmit = handleSubmit((data) => mutation.mutate(data));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adjust Stock">
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex flex-col gap-4">
        <FormField label="Type" htmlFor="type" required error={errors.type?.message}>
          <Select options={MOVEMENT_TYPE_OPTIONS} {...register("type")} />
        </FormField>

        <FormField label="Quantity" htmlFor="quantity" required error={errors.quantity?.message}>
          <Input type="number" min="1" {...register("quantity")} />
        </FormField>

        <FormField label="Reason" htmlFor="reason" required error={errors.reason?.message}>
          <Textarea
            {...register("reason")}
            placeholder="e.g. damaged goods, stock count correction"
          />
        </FormField>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting || mutation.isPending}>
            Record movement
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// The stock-movement history table itself is added to this page by
// FLO-014 (specs/FLO-014-stock-movement-ledger.md).
function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  const productQuery = useQuery({
    queryKey: ["products", id],
    queryFn: () => getProduct(id!),
  });

  if (productQuery.isPending) {
    return <p className="text-sm text-slate-500">Loading product...</p>;
  }

  if (productQuery.isError) {
    return (
      <p role="alert" className="text-sm text-red-600">
        {productQuery.error instanceof ApiError
          ? productQuery.error.message
          : "Could not load product."}
      </p>
    );
  }

  const product = productQuery.data.data;
  const canWriteProducts = canWrite(user?.role, "products");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{product.name}</h1>
          <p className="text-sm text-slate-500">{product.sku}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setIsAdjustModalOpen(true)}
            disabled={!canWriteProducts}
            title={canWriteProducts ? undefined : writeDeniedTitle("products")}
          >
            Adjust Stock
          </Button>
          <Button
            onClick={() => navigate(`/products/${product.id}/edit`)}
            disabled={!canWriteProducts}
            title={canWriteProducts ? undefined : writeDeniedTitle("products")}
          >
            Edit
          </Button>
        </div>
      </div>

      {product.isLowStock && (
        <div role="alert" className="rounded-md bg-amber-50 p-4">
          <Badge variant="warning">Low stock</Badge>
          <span className="ml-2 text-sm text-amber-800">
            Current stock is at or below the minimum alert quantity — consider reordering.
          </span>
        </div>
      )}

      <dl className="grid grid-cols-1 gap-6 rounded-md bg-white p-6 shadow sm:grid-cols-2">
        <DetailField label="Category" value={product.category} />
        <DetailField label="Unit price" value={product.unitPrice.toFixed(2)} />
        <DetailField label="Current stock" value={product.currentStock} />
        <DetailField label="Minimum stock alert quantity" value={product.minStockAlertQuantity} />
        <DetailField label="Location" value={product.location} />
        <DetailField
          label="Status"
          value={
            product.isLowStock ? (
              <Badge variant="warning">Low stock</Badge>
            ) : (
              <Badge variant="success">In stock</Badge>
            )
          }
        />
      </dl>

      <section className="rounded-md bg-white p-6 shadow">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Stock movement history</h2>
        <StockMovementLog productId={product.id} />
      </section>

      <StockAdjustmentModal
        productId={product.id}
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
      />
    </div>
  );
}

export default ProductDetailPage;
