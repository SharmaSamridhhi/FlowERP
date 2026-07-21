import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma.js";
import { ConflictError, NotFoundError } from "../utils/errors.js";
import * as stockMovementService from "./stock-movement.service.js";

// Direct unit/integration tests against the service (real Prisma, real
// test database — no mocking), not only through the HTTP endpoint: FLO-015
// and FLO-017 call recordMovement directly from their own transactions,
// never over HTTP, so this is the layer that actually needs proving. See
// specs/FLO-014-stock-movement-ledger.md's acceptance criteria.

let testUserId: string;
let testProductId: string;

beforeEach(async () => {
  const user = await prisma.user.create({
    data: {
      name: "ZZZ-Test Stock Author",
      email: `zzz-test-stock-${Date.now()}-${Math.random()}@flowerp.test`,
      passwordHash: "not-a-real-hash",
      role: "WAREHOUSE",
    },
  });
  testUserId = user.id;

  const product = await prisma.product.create({
    data: {
      name: "ZZZ-Test Ledger Widget",
      sku: `ZZZ-TEST-LEDGER-${Date.now()}-${Math.random()}`,
      category: "Hardware",
      unitPrice: 10,
      currentStock: 10,
      minStockAlertQuantity: 0,
    },
  });
  testProductId = product.id;
});

afterAll(async () => {
  await prisma.stockMovement.deleteMany({
    where: { product: { sku: { startsWith: "ZZZ-TEST-" } } },
  });
  await prisma.product.deleteMany({ where: { sku: { startsWith: "ZZZ-TEST-" } } });
  await prisma.user.deleteMany({ where: { email: { contains: "zzz-test-stock-" } } });
  await prisma.$disconnect();
});

describe("recordMovement", () => {
  it("an IN movement increases currentStock by the exact quantity", async () => {
    const movement = await stockMovementService.recordMovement({
      productId: testProductId,
      quantity: 5,
      type: "IN",
      reason: "Restock",
      createdById: testUserId,
    });

    expect(movement.quantity).toBe(5);
    expect(movement.type).toBe("IN");

    const product = await prisma.product.findUniqueOrThrow({ where: { id: testProductId } });
    expect(product.currentStock).toBe(15);
  });

  it("an OUT movement within available stock decreases currentStock by the exact quantity", async () => {
    await stockMovementService.recordMovement({
      productId: testProductId,
      quantity: 4,
      type: "OUT",
      reason: "Sold",
      createdById: testUserId,
    });

    const product = await prisma.product.findUniqueOrThrow({ where: { id: testProductId } });
    expect(product.currentStock).toBe(6);
  });

  it("an OUT movement exceeding available stock throws ConflictError with no partial state change", async () => {
    await expect(
      stockMovementService.recordMovement({
        productId: testProductId,
        quantity: 11,
        type: "OUT",
        reason: "Sold",
        createdById: testUserId,
      }),
    ).rejects.toThrow(ConflictError);

    const product = await prisma.product.findUniqueOrThrow({ where: { id: testProductId } });
    expect(product.currentStock).toBe(10);

    const movements = await prisma.stockMovement.findMany({ where: { productId: testProductId } });
    expect(movements).toHaveLength(0);
  });

  it("throws NotFoundError for a non-existent product", async () => {
    await expect(
      stockMovementService.recordMovement({
        productId: "does-not-exist",
        quantity: 1,
        type: "IN",
        reason: "Restock",
        createdById: testUserId,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("only one of two concurrent OUT movements exceeding combined stock succeeds", async () => {
    // currentStock is 10; two concurrent OUT movements of 6 each would
    // together exceed it. Exactly one must succeed.
    const results = await Promise.allSettled([
      stockMovementService.recordMovement({
        productId: testProductId,
        quantity: 6,
        type: "OUT",
        reason: "Sold A",
        createdById: testUserId,
      }),
      stockMovementService.recordMovement({
        productId: testProductId,
        quantity: 6,
        type: "OUT",
        reason: "Sold B",
        createdById: testUserId,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictError);

    const product = await prisma.product.findUniqueOrThrow({ where: { id: testProductId } });
    expect(product.currentStock).toBe(4);

    const movements = await prisma.stockMovement.findMany({ where: { productId: testProductId } });
    expect(movements).toHaveLength(1);
  });
});
