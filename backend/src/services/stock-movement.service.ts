import type { StockMovement } from "@flowerp/shared";
import type {
  StockMovement as PrismaStockMovement,
  StockMovementSource,
  StockMovementType,
} from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { ConflictError, NotFoundError } from "../utils/errors.js";

type StockMovementWithAuthor = PrismaStockMovement & { createdBy: { name: string } };

function toStockMovementResponse(movement: StockMovementWithAuthor): StockMovement {
  return {
    id: movement.id,
    productId: movement.productId,
    quantity: movement.quantity,
    type: movement.type,
    reason: movement.reason,
    sourceType: movement.sourceType,
    sourceId: movement.sourceId,
    createdAt: movement.createdAt.toISOString(),
    createdById: movement.createdById,
    createdByName: movement.createdBy.name,
  };
}

export interface RecordMovementInput {
  productId: string;
  quantity: number;
  type: StockMovementType;
  reason: string;
  createdById: string;
  sourceType?: StockMovementSource;
  sourceId?: string;
}

// The single, atomic, auditable path through which Product.currentStock is
// ever allowed to change (see specs/FLO-014-stock-movement-ledger.md).
// FLO-015/017 call this directly from their own request-handling
// transactions rather than re-implementing stock arithmetic or hitting
// this over HTTP.
export async function recordMovement(input: RecordMovementInput): Promise<StockMovement> {
  const delta = input.type === "IN" ? input.quantity : -input.quantity;

  return prisma.$transaction(async (tx) => {
    // One atomic UPDATE, guarded by a WHERE clause Postgres locks and
    // re-evaluates at the row level. This — not a read-then-write check —
    // is what makes two concurrent OUT movements against the same product
    // serialize correctly instead of racing past zero stock.
    const result = await tx.product.updateMany({
      where:
        input.type === "OUT"
          ? { id: input.productId, currentStock: { gte: input.quantity } }
          : { id: input.productId },
      data: { currentStock: { increment: delta } },
    });

    if (result.count === 0) {
      const product = await tx.product.findUnique({
        where: { id: input.productId },
        select: { id: true },
      });
      if (!product) {
        throw new NotFoundError("Product not found");
      }
      throw new ConflictError("Insufficient stock for this movement");
    }

    const movement = await tx.stockMovement.create({
      data: {
        productId: input.productId,
        quantity: input.quantity,
        type: input.type,
        reason: input.reason,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        createdById: input.createdById,
      },
      include: { createdBy: { select: { name: true } } },
    });

    return toStockMovementResponse(movement);
  });
}

export async function listStockMovements(
  productId: string,
  query: { page: number; limit: number },
): Promise<{ items: StockMovement[]; total: number }> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  const where = { productId };

  const [items, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: { createdBy: { select: { name: true } } },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return { items: items.map(toStockMovementResponse), total };
}
