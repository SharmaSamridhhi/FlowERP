import type {
  CreateProductInput,
  ListProductsQuery,
  Product,
  UpdateProductInput,
} from "@flowerp/shared";
import type { Prisma, Product as PrismaProduct } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { NotFoundError } from "../utils/errors.js";

// Explicit allow-list, not a spread — same reasoning as
// customer.service.ts's toCustomerResponse. `isLowStock` is always derived
// here, never stored, so the frontend never re-implements the comparison
// (see specs/FLO-013-product-inventory-catalog.md).
export function toProductResponse(product: PrismaProduct): Product {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category,
    unitPrice: product.unitPrice.toNumber(),
    currentStock: product.currentStock,
    minStockAlertQuantity: product.minStockAlertQuantity,
    location: product.location,
    imageUrl: product.imageUrl,
    isLowStock: product.currentStock <= product.minStockAlertQuantity,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export async function createProduct(data: CreateProductInput): Promise<Product> {
  const product = await prisma.product.create({ data });
  return toProductResponse(product);
}

export async function listProducts(
  query: ListProductsQuery,
): Promise<{ items: Product[]; total: number }> {
  const { page, limit, search, category, lowStock, stockStatus } = query;

  const lowStockIds = lowStock
    ? (
        await prisma.$queryRaw<
          { id: string }[]
        >`SELECT id FROM products WHERE "currentStock" <= "minStockAlertQuantity"`
      ).map((row) => row.id)
    : undefined;

  const where: Prisma.ProductWhereInput = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(category ? { category: { contains: category, mode: "insensitive" } } : {}),
    ...(lowStockIds ? { id: { in: lowStockIds } } : {}),
    ...(stockStatus === "in_stock" ? { currentStock: { gt: 0 } } : {}),
    ...(stockStatus === "out_of_stock" ? { currentStock: { lte: 0 } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return { items: items.map(toProductResponse), total };
}

export async function findProductById(id: string): Promise<Product> {
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    throw new NotFoundError("Product not found");
  }

  return toProductResponse(product);
}

export async function updateProduct(id: string, data: UpdateProductInput): Promise<Product> {
  await ensureProductExists(id);
  const product = await prisma.product.update({ where: { id }, data });
  return toProductResponse(product);
}

async function ensureProductExists(id: string): Promise<void> {
  const exists = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!exists) {
    throw new NotFoundError("Product not found");
  }
}
