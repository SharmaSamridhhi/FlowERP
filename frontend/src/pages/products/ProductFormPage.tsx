import {
  CreateProductSchema,
  MAX_PRODUCT_IMAGE_BYTES,
  PRODUCT_IMAGE_CONTENT_TYPES,
} from "@flowerp/shared";
import type { CreateProductInput, ProductImageContentType } from "@flowerp/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import {
  confirmProductImage,
  createProduct,
  getProduct,
  requestImageUploadUrl,
  updateProduct,
  uploadFileToPresignedUrl,
} from "../../api/products";
import { Button, Input } from "../../components/atoms";
import { UploadCloudIcon } from "../../components/atoms/icons";
import { FormField, ProductImage } from "../../components/molecules";
import { ApiError } from "../../lib/api-client";
import { useToast } from "../../lib/toast-context";

function validateImageFile(file: File): string | null {
  if (!(PRODUCT_IMAGE_CONTENT_TYPES as readonly string[]).includes(file.type)) {
    return "Please choose a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    return "Image must be 5MB or smaller.";
  }
  return null;
}

// Presign -> direct browser PUT to S3 -> confirm. Only ever runs after the
// product itself exists (create must succeed first), since the S3 object
// key is scoped by product id. See specs/FLO-024-product-image-s3.md.
async function uploadProductImage(productId: string, file: File): Promise<void> {
  const contentType = file.type as ProductImageContentType;
  const presign = await requestImageUploadUrl(productId, {
    contentType,
    fileSizeBytes: file.size,
  });
  await uploadFileToPresignedUrl(presign.data.uploadUrl, file, contentType);
  await confirmProductImage(productId, { objectKey: presign.data.objectKey });
}

function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const error = validateImageFile(file);
    if (error) {
      setFileError(error);
      return;
    }
    setFileError(null);
    setSelectedFile(file);
    setPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return URL.createObjectURL(file);
    });
  }

  function clearSelectedFile() {
    setSelectedFile(null);
    setPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
  }

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

      if (selectedFile) {
        setIsUploadingImage(true);
        try {
          await uploadProductImage(response.data.id, selectedFile);
          await queryClient.invalidateQueries({ queryKey: ["products", response.data.id] });
          showToast(
            "success",
            isEditing ? "Product and image updated." : "Product and image created.",
          );
        } catch {
          showToast(
            "error",
            "Product saved, but the image upload failed. You can try again from the edit page.",
          );
        } finally {
          setIsUploadingImage(false);
        }
      } else {
        showToast(
          "success",
          isEditing ? "Product updated successfully." : "Product created successfully.",
        );
      }

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

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Product image</span>
          <div className="flex items-center gap-4">
            <ProductImage
              src={previewUrl ?? existingProductQuery.data?.data.imageUrl}
              alt={existingProductQuery.data?.data.name ?? "Product"}
              size="lg"
            />
            <div className="flex flex-col items-start gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={PRODUCT_IMAGE_CONTENT_TYPES.join(",")}
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloudIcon className="h-4 w-4" />
                {selectedFile ? "Choose a different image" : "Choose image"}
              </Button>
              {selectedFile && (
                <button
                  type="button"
                  onClick={clearSelectedFile}
                  className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
                >
                  Remove selected image
                </button>
              )}
              <p className="text-xs text-slate-500">JPEG, PNG, or WebP. Max 5MB.</p>
              {fileError && (
                <p role="alert" className="text-xs text-red-600">
                  {fileError}
                </p>
              )}
            </div>
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
          <Button type="submit" isLoading={isSubmitting || mutation.isPending || isUploadingImage}>
            {isEditing ? "Save changes" : "Create product"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ProductFormPage;
