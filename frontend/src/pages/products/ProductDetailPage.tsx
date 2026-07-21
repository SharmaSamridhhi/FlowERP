import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getProduct } from "../../api/products";
import { Badge, Button } from "../../components/atoms";
import { ApiError } from "../../lib/api-client";

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value ?? "—"}</dd>
    </div>
  );
}

// The stock-movement history table itself is added to this page by
// FLO-014 (specs/FLO-014-stock-movement-ledger.md), not this spec.
function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{product.name}</h1>
          <p className="text-sm text-slate-500">{product.sku}</p>
        </div>
        <Button onClick={() => navigate(`/products/${product.id}/edit`)}>Edit</Button>
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
    </div>
  );
}

export default ProductDetailPage;
