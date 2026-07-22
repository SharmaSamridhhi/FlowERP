import { ImageIcon } from "../atoms/icons";

export type ProductImageSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<ProductImageSize, string> = {
  sm: "h-10 w-10",
  md: "h-20 w-20",
  lg: "h-40 w-40",
};

export interface ProductImageProps {
  src?: string | null;
  alt: string;
  size?: ProductImageSize;
  className?: string;
}

// Shared display piece for a product's photo — used as a list thumbnail,
// a detail-page hero, and a form-page preview, so the placeholder fallback
// (no image yet) looks identical everywhere. See specs/FLO-024-product-image-s3.md.
export function ProductImage({ src, alt, size = "md", className = "" }: ProductImageProps) {
  const sizeClass = SIZE_CLASSES[size];

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`${sizeClass} shrink-0 rounded-md border border-slate-200 object-cover ${className}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`${alt} — no image`}
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-slate-300 ${className}`}
    >
      <ImageIcon className="h-1/2 w-1/2" />
    </div>
  );
}
