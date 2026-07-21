import type {
  CreatePurchaseOrderInput,
  InsufficientStockItem,
  ListPurchaseOrdersQuery,
  PurchaseOrder,
  PurchaseOrderWithItems,
  UpdatePurchaseOrderInput,
} from "@flowerp/shared";
import type {
  Prisma,
  PurchaseOrder as PrismaPurchaseOrder,
  PurchaseOrderItem as PrismaPurchaseOrderItem,
} from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { createWithUniqueDocumentNumber } from "../utils/document-number.js";
import { ConflictError, NotFoundError } from "../utils/errors.js";
import { recordMovement } from "./stock-movement.service.js";

const PO_DETAIL_INCLUDE = { items: true } satisfies Prisma.PurchaseOrderInclude;

type POWithItems = PrismaPurchaseOrder & { items: PrismaPurchaseOrderItem[] };

// totalQuantity/totalCost aren't columns on PurchaseOrder (unlike
// SalesChallan's stored totalQuantity) — derived from items on every read
// instead, since there's no separate stock-affecting write path that would
// need them denormalized for.
function toPurchaseOrderResponse(po: POWithItems): PurchaseOrder {
  const totalQuantity = po.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCost = po.items.reduce(
    (sum, item) => sum + item.quantity * item.unitCost.toNumber(),
    0,
  );
  return {
    id: po.id,
    poNumber: po.poNumber,
    supplierName: po.supplierName,
    status: po.status,
    totalQuantity,
    totalCost,
    createdById: po.createdById,
    createdAt: po.createdAt.toISOString(),
    updatedAt: po.updatedAt.toISOString(),
  };
}

function toPurchaseOrderWithItemsResponse(po: POWithItems): PurchaseOrderWithItems {
  return {
    ...toPurchaseOrderResponse(po),
    items: po.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productNameSnapshot: item.productNameSnapshot,
      productSkuSnapshot: item.productSkuSnapshot,
      unitCost: item.unitCost.toNumber(),
      quantity: item.quantity,
    })),
  };
}

// Race-safe "unique constraint + retry" numbering, shared with FLO-015's
// sales challans via backend/src/utils/document-number.ts.
async function findLatestPoNumber(prefix: string): Promise<string | null> {
  const latest = await prisma.purchaseOrder.findFirst({
    where: { poNumber: { startsWith: prefix } },
    orderBy: { poNumber: "desc" },
    select: { poNumber: true },
  });
  return latest?.poNumber ?? null;
}

async function findProductsOrThrow(productIds: string[]) {
  const uniqueIds = [...new Set(productIds)];
  const products = await prisma.product.findMany({ where: { id: { in: uniqueIds } } });
  if (products.length !== uniqueIds.length) {
    throw new NotFoundError("One or more products in the purchase order were not found");
  }
  return new Map(products.map((product) => [product.id, product]));
}

export async function createPurchaseOrder(
  data: CreatePurchaseOrderInput,
  createdById: string,
): Promise<PurchaseOrderWithItems> {
  const productById = await findProductsOrThrow(data.items.map((item) => item.productId));
  const itemsCreate = data.items.map((item) => {
    const product = productById.get(item.productId)!;
    return {
      productId: item.productId,
      productNameSnapshot: product.name,
      productSkuSnapshot: product.sku,
      unitCost: item.unitCost,
      quantity: item.quantity,
    };
  });

  const year = new Date().getFullYear();
  const po = await createWithUniqueDocumentNumber({
    prefix: `PO-${year}-`,
    findLatestNumber: findLatestPoNumber,
    attemptInsert: (poNumber) =>
      prisma.purchaseOrder.create({
        data: {
          poNumber,
          supplierName: data.supplierName,
          createdById,
          items: { create: itemsCreate },
        },
        include: PO_DETAIL_INCLUDE,
      }),
  });
  return toPurchaseOrderWithItemsResponse(po);
}

export async function listPurchaseOrders(
  query: ListPurchaseOrdersQuery,
): Promise<{ items: PurchaseOrder[]; total: number }> {
  const { page, limit, search, status } = query;

  const where: Prisma.PurchaseOrderWhereInput = {
    ...(search
      ? {
          OR: [
            { poNumber: { contains: search, mode: "insensitive" } },
            { supplierName: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: PO_DETAIL_INCLUDE,
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return { items: items.map(toPurchaseOrderResponse), total };
}

export async function findPurchaseOrderById(id: string): Promise<PurchaseOrderWithItems> {
  const po = await prisma.purchaseOrder.findUnique({ where: { id }, include: PO_DETAIL_INCLUDE });
  if (!po) {
    throw new NotFoundError("Purchase order not found");
  }
  return toPurchaseOrderWithItemsResponse(po);
}

export async function updateDraftPurchaseOrder(
  id: string,
  data: UpdatePurchaseOrderInput,
): Promise<PurchaseOrderWithItems> {
  const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError("Purchase order not found");
  }
  if (existing.status !== "DRAFT") {
    throw new ConflictError("Only a draft purchase order can be edited");
  }

  let itemsUpdate: Prisma.PurchaseOrderUpdateInput["items"];

  if (data.items) {
    const productById = await findProductsOrThrow(data.items.map((item) => item.productId));
    itemsUpdate = {
      deleteMany: {},
      create: data.items.map((item) => {
        const product = productById.get(item.productId)!;
        return {
          productId: item.productId,
          productNameSnapshot: product.name,
          productSkuSnapshot: product.sku,
          unitCost: item.unitCost,
          quantity: item.quantity,
        };
      }),
    };
  }

  const po = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      ...(data.supplierName ? { supplierName: data.supplierName } : {}),
      ...(itemsUpdate ? { items: itemsUpdate } : {}),
    },
    include: PO_DETAIL_INCLUDE,
  });

  return toPurchaseOrderWithItemsResponse(po);
}

// Receive is the inbound counterpart to a challan confirm: within one
// transaction, every line item's stock increase and the status transition
// happen atomically. Unlike confirm, an IN movement can never fail on a
// stock check — the only failure modes here are state guards.
export async function receivePurchaseOrder(
  id: string,
  receivedById: string,
): Promise<PurchaseOrderWithItems> {
  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!po) {
      throw new NotFoundError("Purchase order not found");
    }
    if (po.status !== "DRAFT") {
      throw new ConflictError(
        `Only a draft purchase order can be received (this order is ${po.status.toLowerCase()})`,
      );
    }

    for (const item of po.items) {
      await recordMovement(
        {
          productId: item.productId,
          quantity: item.quantity,
          type: "IN",
          reason: `Purchase order ${po.poNumber} received`,
          createdById: receivedById,
          sourceType: "PURCHASE_ORDER",
          sourceId: po.id,
        },
        tx,
      );
    }

    const updated = await tx.purchaseOrder.update({
      where: { id },
      data: { status: "RECEIVED" },
      include: PO_DETAIL_INCLUDE,
    });
    return toPurchaseOrderWithItemsResponse(updated);
  });
}

// Cancel-after-receive policy (explicit scope decision, per
// specs/FLO-017-purchase-order.md): a Draft cancels with no stock effect.
// A Received PO's stock is reversed via compensating OUT movements — but
// unlike a challan cancel's compensating IN (which can never fail), an OUT
// reversal genuinely can go negative if the received stock was already
// partly sold elsewhere in the meantime. That must not silently happen:
// every line item is pre-checked against current stock, and the whole
// cancel is rejected with a clear per-product error if reversing would
// take any product negative — recordMovement's own atomic per-row guard
// remains the final race-safety net underneath this pre-check.
export async function cancelPurchaseOrder(
  id: string,
  cancelledById: string,
): Promise<PurchaseOrderWithItems> {
  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!po) {
      throw new NotFoundError("Purchase order not found");
    }
    if (po.status === "CANCELLED") {
      throw new ConflictError("Purchase order is already cancelled");
    }

    if (po.status === "RECEIVED") {
      const products = await tx.product.findMany({
        where: { id: { in: po.items.map((item) => item.productId) } },
      });
      const productById = new Map(products.map((product) => [product.id, product]));
      const wouldGoNegative = po.items.filter((item) => {
        const product = productById.get(item.productId);
        return !product || product.currentStock < item.quantity;
      });
      if (wouldGoNegative.length > 0) {
        const names = wouldGoNegative.map((item) => item.productNameSnapshot).join(", ");
        const details: InsufficientStockItem[] = wouldGoNegative.map((item) => ({
          productId: item.productId,
          productName: item.productNameSnapshot,
          requestedQuantity: item.quantity,
          availableQuantity: productById.get(item.productId)?.currentStock ?? 0,
        }));
        throw new ConflictError(
          `Cannot cancel: reversing this receipt would take stock negative for: ${names}`,
          details,
        );
      }

      for (const item of po.items) {
        await recordMovement(
          {
            productId: item.productId,
            quantity: item.quantity,
            type: "OUT",
            reason: "Purchase order cancelled",
            createdById: cancelledById,
            sourceType: "PURCHASE_ORDER",
            sourceId: po.id,
          },
          tx,
        );
      }
    }

    const updated = await tx.purchaseOrder.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: PO_DETAIL_INCLUDE,
    });
    return toPurchaseOrderWithItemsResponse(updated);
  });
}
