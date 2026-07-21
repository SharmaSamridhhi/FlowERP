import type {
  CreateChallanInput,
  ListChallansQuery,
  SalesChallan,
  SalesChallanWithItems,
  UpdateChallanInput,
} from "@flowerp/shared";
import type {
  Prisma,
  SalesChallan as PrismaSalesChallan,
  SalesChallanItem as PrismaSalesChallanItem,
} from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { ConflictError, NotFoundError } from "../utils/errors.js";
import { recordMovement } from "./stock-movement.service.js";

const CHALLAN_LIST_INCLUDE = {
  customer: { select: { name: true } },
} satisfies Prisma.SalesChallanInclude;
const CHALLAN_DETAIL_INCLUDE = {
  customer: { select: { name: true } },
  items: true,
} satisfies Prisma.SalesChallanInclude;

type ChallanWithCustomer = PrismaSalesChallan & { customer: { name: string } };
type ChallanWithItems = ChallanWithCustomer & { items: PrismaSalesChallanItem[] };

function toChallanResponse(challan: ChallanWithCustomer): SalesChallan {
  return {
    id: challan.id,
    challanNumber: challan.challanNumber,
    status: challan.status,
    totalQuantity: challan.totalQuantity,
    customerId: challan.customerId,
    customerName: challan.customer.name,
    createdById: challan.createdById,
    createdAt: challan.createdAt.toISOString(),
    updatedAt: challan.updatedAt.toISOString(),
  };
}

function toChallanWithItemsResponse(challan: ChallanWithItems): SalesChallanWithItems {
  return {
    ...toChallanResponse(challan),
    items: challan.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productNameSnapshot: item.productNameSnapshot,
      productSkuSnapshot: item.productSkuSnapshot,
      unitPriceSnapshot: item.unitPriceSnapshot.toNumber(),
      quantity: item.quantity,
    })),
  };
}

const CHALLAN_NUMBER_MAX_ATTEMPTS = 5;

// Date-scoped sequence (CH-2026-000123), generated optimistically from the
// current max and relying on challanNumber's unique constraint (FLO-004) as
// the actual race guard: a collision under concurrent creates surfaces as
// Prisma's P2002, which createChallan retries with a freshly-read number.
// This is the "unique constraint + retry" strategy named as acceptable in
// specs/FLO-015-sales-challan-backend.md's Implementation Notes (the
// alternative being a DB sequence, not used here to avoid a schema
// migration for a single counter).
async function generateNextChallanNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CH-${year}-`;

  const latest = await prisma.salesChallan.findFirst({
    where: { challanNumber: { startsWith: prefix } },
    orderBy: { challanNumber: "desc" },
    select: { challanNumber: true },
  });

  const nextSeq = latest ? Number.parseInt(latest.challanNumber.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(nextSeq).padStart(6, "0")}`;
}

async function findProductsOrThrow(productIds: string[]) {
  const uniqueIds = [...new Set(productIds)];
  const products = await prisma.product.findMany({ where: { id: { in: uniqueIds } } });
  if (products.length !== uniqueIds.length) {
    throw new NotFoundError("One or more products in the challan were not found");
  }
  return new Map(products.map((product) => [product.id, product]));
}

export async function createChallan(
  data: CreateChallanInput,
  createdById: string,
): Promise<SalesChallanWithItems> {
  const customer = await prisma.customer.findUnique({
    where: { id: data.customerId },
    select: { id: true },
  });
  if (!customer) {
    throw new NotFoundError("Customer not found");
  }

  const productById = await findProductsOrThrow(data.items.map((item) => item.productId));
  const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);
  const itemsCreate = data.items.map((item) => {
    const product = productById.get(item.productId)!;
    return {
      productId: item.productId,
      productNameSnapshot: product.name,
      productSkuSnapshot: product.sku,
      unitPriceSnapshot: product.unitPrice,
      quantity: item.quantity,
    };
  });

  for (let attempt = 0; attempt < CHALLAN_NUMBER_MAX_ATTEMPTS; attempt++) {
    const challanNumber = await generateNextChallanNumber();
    try {
      const challan = await prisma.salesChallan.create({
        data: {
          challanNumber,
          customerId: data.customerId,
          createdById,
          totalQuantity,
          items: { create: itemsCreate },
        },
        include: CHALLAN_DETAIL_INCLUDE,
      });
      return toChallanWithItemsResponse(challan);
    } catch (err) {
      const isChallanNumberConflict =
        err instanceof Error && "code" in err && (err as { code: unknown }).code === "P2002";
      if (isChallanNumberConflict && attempt < CHALLAN_NUMBER_MAX_ATTEMPTS - 1) {
        continue;
      }
      throw err;
    }
  }
  /* istanbul ignore next -- unreachable: the loop above always returns or throws */
  throw new Error("Could not generate a unique challan number");
}

export async function listChallans(
  query: ListChallansQuery,
): Promise<{ items: SalesChallan[]; total: number }> {
  const { page, limit, search, status, customerId } = query;

  const where: Prisma.SalesChallanWhereInput = {
    ...(search ? { challanNumber: { contains: search, mode: "insensitive" } } : {}),
    ...(status ? { status } : {}),
    ...(customerId ? { customerId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.salesChallan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: CHALLAN_LIST_INCLUDE,
    }),
    prisma.salesChallan.count({ where }),
  ]);

  return { items: items.map(toChallanResponse), total };
}

export async function findChallanById(id: string): Promise<SalesChallanWithItems> {
  const challan = await prisma.salesChallan.findUnique({
    where: { id },
    include: CHALLAN_DETAIL_INCLUDE,
  });
  if (!challan) {
    throw new NotFoundError("Sales challan not found");
  }
  return toChallanWithItemsResponse(challan);
}

export async function updateDraftChallan(
  id: string,
  data: UpdateChallanInput,
): Promise<SalesChallanWithItems> {
  const existing = await prisma.salesChallan.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError("Sales challan not found");
  }
  if (existing.status !== "DRAFT") {
    throw new ConflictError("Only a draft challan can be edited");
  }

  if (data.customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
      select: { id: true },
    });
    if (!customer) {
      throw new NotFoundError("Customer not found");
    }
  }

  let itemsUpdate: Prisma.SalesChallanUpdateInput["items"];
  let totalQuantity: number | undefined;

  if (data.items) {
    const productById = await findProductsOrThrow(data.items.map((item) => item.productId));
    totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);
    itemsUpdate = {
      deleteMany: {},
      create: data.items.map((item) => {
        const product = productById.get(item.productId)!;
        return {
          productId: item.productId,
          productNameSnapshot: product.name,
          productSkuSnapshot: product.sku,
          unitPriceSnapshot: product.unitPrice,
          quantity: item.quantity,
        };
      }),
    };
  }

  const challan = await prisma.salesChallan.update({
    where: { id },
    data: {
      ...(data.customerId ? { customerId: data.customerId } : {}),
      ...(itemsUpdate ? { totalQuantity, items: itemsUpdate } : {}),
    },
    include: CHALLAN_DETAIL_INCLUDE,
  });

  return toChallanWithItemsResponse(challan);
}

// Confirm is the module's core contract: the status transition and every
// line item's stock deduction happen in one transaction, so a mid-way
// insufficient-stock failure rolls back everything, not just the failing
// item. See specs/FLO-015-sales-challan-backend.md's Implementation Notes.
export async function confirmChallan(
  id: string,
  confirmedById: string,
): Promise<SalesChallanWithItems> {
  return prisma.$transaction(async (tx) => {
    const challan = await tx.salesChallan.findUnique({ where: { id }, include: { items: true } });
    if (!challan) {
      throw new NotFoundError("Sales challan not found");
    }
    if (challan.status !== "DRAFT") {
      throw new ConflictError(
        `Only a draft challan can be confirmed (this challan is ${challan.status.toLowerCase()})`,
      );
    }

    // Pre-check every line item so a multi-item shortfall is reported as
    // one clear message naming every offending product, rather than
    // surfacing only the first one recordMovement happens to hit. The
    // per-item atomic guard inside recordMovement (below) remains the
    // actual race-safety net against a concurrent confirm on the same
    // product — this pre-check can still race and is a UX nicety, not the
    // correctness boundary.
    const products = await tx.product.findMany({
      where: { id: { in: challan.items.map((item) => item.productId) } },
    });
    const productById = new Map(products.map((product) => [product.id, product]));
    const insufficient = challan.items.filter((item) => {
      const product = productById.get(item.productId);
      return !product || product.currentStock < item.quantity;
    });
    if (insufficient.length > 0) {
      const names = insufficient.map((item) => item.productNameSnapshot).join(", ");
      throw new ConflictError(`Insufficient stock for: ${names}`);
    }

    for (const item of challan.items) {
      await recordMovement(
        {
          productId: item.productId,
          quantity: item.quantity,
          type: "OUT",
          reason: `Sales challan ${challan.challanNumber} confirmed`,
          createdById: confirmedById,
          sourceType: "CHALLAN",
          sourceId: challan.id,
        },
        tx,
      );
    }

    const updated = await tx.salesChallan.update({
      where: { id },
      data: { status: "CONFIRMED" },
      include: CHALLAN_DETAIL_INCLUDE,
    });
    return toChallanWithItemsResponse(updated);
  });
}

// Cancel-after-confirm policy (explicit scope decision the assignment is
// silent on, per specs/FLO-015-sales-challan-backend.md): a Draft cancels
// with no stock effect; a Confirmed challan's stock is reversed via
// compensating IN movements, keeping the ledger the sole source of truth
// instead of quietly resetting currentStock.
export async function cancelChallan(
  id: string,
  cancelledById: string,
): Promise<SalesChallanWithItems> {
  return prisma.$transaction(async (tx) => {
    const challan = await tx.salesChallan.findUnique({ where: { id }, include: { items: true } });
    if (!challan) {
      throw new NotFoundError("Sales challan not found");
    }
    if (challan.status === "CANCELLED") {
      throw new ConflictError("Challan is already cancelled");
    }

    if (challan.status === "CONFIRMED") {
      for (const item of challan.items) {
        await recordMovement(
          {
            productId: item.productId,
            quantity: item.quantity,
            type: "IN",
            reason: "Challan cancelled",
            createdById: cancelledById,
            sourceType: "CHALLAN",
            sourceId: challan.id,
          },
          tx,
        );
      }
    }

    const updated = await tx.salesChallan.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: CHALLAN_DETAIL_INCLUDE,
    });
    return toChallanWithItemsResponse(updated);
  });
}
