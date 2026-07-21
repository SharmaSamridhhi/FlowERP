import { CreateProductSchema } from "@flowerp/shared";
import type { CreateProductInput } from "@flowerp/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { createProduct, getProduct, updateProduct } from "../../api/products";
import { Button, Input } from "../../components/atoms";
import { FormField } from "../../components/molecules";
import { ApiError } from "../../lib/api-client";
import { useToast } from "../../lib/toast-context";

function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const existingProductQuery = useQuery({
    queryKey: ["products", id],
    queryFn: () => getProduct(id!),
    enabled: isEditing,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(CreateProductSchema),
    defaultValues: {
      name: "",
      sku: "",
      category: "",
      unitPrice: 0,
      minStockAlertQuantity: 0,
      location: "",
    },
  });

  useEffect(() => {
    const product = existingProductQuery.data?.data;
    if (!product) {
      return;
    }
    reset({
      name: product.name,
      sku: product.sku,
      category: product.category,
      unitPrice: product.unitPrice,
      minStockAlertQuantity: product.minStockAlertQuantity,
      location: product.location ?? "",
    });
  }, [existingProductQuery.data, reset]);

  const mutation = useMutation({
    mutationFn: async (data: CreateProductInput) => {
      if (isEditing) {
        // The update schema omits `sku` — it's immutable once created.
        const { sku: _sku, ...editable } = data;
        return updateProduct(id!, editable);
      }
      return createProduct(data);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      showToast(
        "success",
        isEditing ? "Product updated successfully." : "Product created successfully.",
      );
      navigate(`/products/${response.data.id}`);
    },
    onError: (err) => {
      setServerError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
    },
  });

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    mutation.mutate(data);
  });

  if (isEditing && existingProductQuery.isPending) {
    return <p className="text-sm text-slate-500">Loading product...</p>;
  }

  return (
    <div className="max-w-2xl rounded-md bg-white p-6 shadow">
      <h1 className="mb-6 text-lg font-semibold text-slate-900">
        {isEditing ? "Edit Product" : "Add Product"}
      </h1>

      <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex flex-col gap-4">
        <FormField label="Name" htmlFor="name" required error={errors.name?.message}>
          <Input {...register("name")} />
        </FormField>

        <FormField label="SKU" htmlFor="sku" required error={errors.sku?.message}>
          <Input {...register("sku")} disabled={isEditing} />
        </FormField>

        <FormField label="Category" htmlFor="category" required error={errors.category?.message}>
          <Input {...register("category")} />
        </FormField>

        <FormField
          label="Unit price"
          htmlFor="unitPrice"
          required
          error={errors.unitPrice?.message}
        >
          <Input type="number" step="0.01" min="0" {...register("unitPrice")} />
        </FormField>

        <FormField
          label="Minimum stock alert quantity"
          htmlFor="minStockAlertQuantity"
          required
          error={errors.minStockAlertQuantity?.message}
        >
          <Input type="number" min="0" {...register("minStockAlertQuantity")} />
        </FormField>

        <FormField label="Location" htmlFor="location" hint="Optional">
          <Input {...register("location")} />
        </FormField>

        {serverError && (
          <p role="alert" className="text-sm text-red-600">
            {serverError}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting || mutation.isPending}>
            {isEditing ? "Save changes" : "Create product"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ProductFormPage;
