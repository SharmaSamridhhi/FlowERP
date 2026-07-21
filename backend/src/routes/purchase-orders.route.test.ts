import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../services/user.service.js";

// Real Prisma, real test database — no mocking. Self-seeding
// (beforeAll/afterAll), consistent with FLO-015's sales-challans.route.test.ts.

const TEST_PASSWORD = "Test-Password-123!";

const TEST_USERS = [
  { name: "PO Test Admin", email: "po-test-admin@flowerp.test", role: "ADMIN" as const },
  { name: "PO Test Sales", email: "po-test-sales@flowerp.test", role: "SALES" as const },
  {
    name: "PO Test Warehouse",
    email: "po-test-warehouse@flowerp.test",
    role: "WAREHOUSE" as const,
  },
  { name: "PO Test Accounts", email: "po-test-accounts@flowerp.test", role: "ACCOUNTS" as const },
];

const tokens: Record<string, string> = {};

beforeAll(async () => {
  const passwordHash = await hashPassword(TEST_PASSWORD);
  for (const user of TEST_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, passwordHash },
      create: { ...user, passwordHash },
    });
  }

  for (const user of TEST_USERS) {
    const response = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password: TEST_PASSWORD });
    tokens[user.role] = response.body.data.token as string;
  }
});

afterAll(async () => {
  // Deletion order respects onDelete: Restrict on Product/User — POs (and
  // their cascaded items) and stock movements must go first.
  await prisma.purchaseOrder.deleteMany({
    where: { supplierName: { startsWith: "ZZZ-Test PO Supplier" } },
  });
  await prisma.stockMovement.deleteMany({
    where: { product: { sku: { startsWith: "ZZZ-PO-TEST-" } } },
  });
  await prisma.product.deleteMany({ where: { sku: { startsWith: "ZZZ-PO-TEST-" } } });
  await prisma.user.deleteMany({ where: { email: { in: TEST_USERS.map((u) => u.email) } } });
  await prisma.$disconnect();
});

function authed(role: string) {
  return { Authorization: `Bearer ${tokens[role]}` };
}

let counter = 0;
function nextTag(): string {
  counter += 1;
  return `${Date.now()}-${counter}`;
}

async function createTestProduct(overrides: { currentStock?: number } = {}) {
  return prisma.product.create({
    data: {
      name: `ZZZ-Test PO Product ${nextTag()}`,
      sku: `ZZZ-PO-TEST-${nextTag()}`,
      category: "Hardware",
      unitPrice: 10,
      currentStock: overrides.currentStock ?? 0,
      minStockAlertQuantity: 0,
    },
  });
}

async function createDraftPO(items: { productId: string; quantity: number; unitCost: number }[]) {
  const response = await request(app)
    .post("/purchase-orders")
    .set(authed("WAREHOUSE"))
    .send({ supplierName: `ZZZ-Test PO Supplier ${nextTag()}`, items });
  return response.body.data as { id: string; poNumber: string };
}

describe("POST /purchase-orders", () => {
  it("creates a Draft PO with an auto-generated number, snapshot data, and no stock effect", async () => {
    const product = await createTestProduct({ currentStock: 10 });

    const response = await request(app)
      .post("/purchase-orders")
      .set(authed("WAREHOUSE"))
      .send({
        supplierName: "ZZZ-Test PO Supplier Acme",
        items: [{ productId: product.id, quantity: 5, unitCost: 3.25 }],
      });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe("DRAFT");
    expect(response.body.data.poNumber).toMatch(/^PO-\d{4}-\d{6}$/);
    expect(response.body.data.totalQuantity).toBe(5);
    expect(response.body.data.totalCost).toBe(16.25);
    expect(response.body.data.items[0]).toMatchObject({
      productId: product.id,
      productNameSnapshot: product.name,
      productSkuSnapshot: product.sku,
      unitCost: 3.25,
      quantity: 5,
    });

    const refreshedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(refreshedProduct.currentStock).toBe(10);
  });

  it("generates unique PO numbers under concurrent creation", async () => {
    const product = await createTestProduct();

    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app)
          .post("/purchase-orders")
          .set(authed("WAREHOUSE"))
          .send({
            supplierName: `ZZZ-Test PO Supplier ${nextTag()}`,
            items: [{ productId: product.id, quantity: 1, unitCost: 1 }],
          }),
      ),
    );

    expect(responses.every((r) => r.status === 201)).toBe(true);
    const numbers = responses.map((r) => r.body.data.poNumber as string);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("returns 400 when items is empty", async () => {
    const response = await request(app)
      .post("/purchase-orders")
      .set(authed("WAREHOUSE"))
      .send({ supplierName: "ZZZ-Test PO Supplier", items: [] });

    expect(response.status).toBe(400);
  });

  it("returns 404 for a non-existent product", async () => {
    const response = await request(app)
      .post("/purchase-orders")
      .set(authed("ADMIN"))
      .send({
        supplierName: "ZZZ-Test PO Supplier",
        items: [{ productId: "does-not-exist", quantity: 1, unitCost: 1 }],
      });

    expect(response.status).toBe(404);
  });

  it.each(["SALES", "ACCOUNTS"])("returns 403 for %s", async (role) => {
    const product = await createTestProduct();

    const response = await request(app)
      .post("/purchase-orders")
      .set(authed(role))
      .send({
        supplierName: "ZZZ-Test PO Supplier",
        items: [{ productId: product.id, quantity: 1, unitCost: 1 }],
      });

    expect(response.status).toBe(403);
  });
});

describe("PATCH /purchase-orders/:id", () => {
  it("re-snapshots line items and updates the supplier name on a Draft", async () => {
    const productA = await createTestProduct();
    const productB = await createTestProduct();
    const po = await createDraftPO([{ productId: productA.id, quantity: 2, unitCost: 5 }]);

    const response = await request(app)
      .patch(`/purchase-orders/${po.id}`)
      .set(authed("WAREHOUSE"))
      .send({
        supplierName: "ZZZ-Test PO Supplier Renamed",
        items: [{ productId: productB.id, quantity: 4, unitCost: 8 }],
      });

    expect(response.status).toBe(200);
    expect(response.body.data.supplierName).toBe("ZZZ-Test PO Supplier Renamed");
    expect(response.body.data.totalQuantity).toBe(4);
    expect(response.body.data.items[0]).toMatchObject({
      productId: productB.id,
      unitCost: 8,
      quantity: 4,
    });
  });

  it("rejects editing a Received PO", async () => {
    const product = await createTestProduct();
    const po = await createDraftPO([{ productId: product.id, quantity: 1, unitCost: 1 }]);
    await request(app).post(`/purchase-orders/${po.id}/receive`).set(authed("WAREHOUSE"));

    const response = await request(app)
      .patch(`/purchase-orders/${po.id}`)
      .set(authed("WAREHOUSE"))
      .send({ items: [{ productId: product.id, quantity: 2, unitCost: 1 }] });

    expect(response.status).toBe(409);
  });
});

describe("POST /purchase-orders/:id/receive", () => {
  it("increases stock for every line item atomically", async () => {
    const productA = await createTestProduct({ currentStock: 10 });
    const productB = await createTestProduct({ currentStock: 20 });
    const po = await createDraftPO([
      { productId: productA.id, quantity: 4, unitCost: 2 },
      { productId: productB.id, quantity: 5, unitCost: 3 },
    ]);

    const response = await request(app)
      .post(`/purchase-orders/${po.id}/receive`)
      .set(authed("WAREHOUSE"));

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("RECEIVED");

    const refreshedA = await prisma.product.findUniqueOrThrow({ where: { id: productA.id } });
    const refreshedB = await prisma.product.findUniqueOrThrow({ where: { id: productB.id } });
    expect(refreshedA.currentStock).toBe(14);
    expect(refreshedB.currentStock).toBe(25);

    const movements = await prisma.stockMovement.findMany({
      where: { sourceType: "PURCHASE_ORDER", sourceId: po.id },
    });
    expect(movements).toHaveLength(2);
    expect(movements.every((m) => m.type === "IN")).toBe(true);
  });

  it("rejects receiving an already-Received PO", async () => {
    const product = await createTestProduct();
    const po = await createDraftPO([{ productId: product.id, quantity: 1, unitCost: 1 }]);
    await request(app).post(`/purchase-orders/${po.id}/receive`).set(authed("WAREHOUSE"));

    const response = await request(app)
      .post(`/purchase-orders/${po.id}/receive`)
      .set(authed("WAREHOUSE"));

    expect(response.status).toBe(409);
  });

  it("rejects receiving a Cancelled PO", async () => {
    const product = await createTestProduct();
    const po = await createDraftPO([{ productId: product.id, quantity: 1, unitCost: 1 }]);
    await request(app).post(`/purchase-orders/${po.id}/cancel`).set(authed("WAREHOUSE"));

    const response = await request(app)
      .post(`/purchase-orders/${po.id}/receive`)
      .set(authed("WAREHOUSE"));

    expect(response.status).toBe(409);
  });

  it.each(["SALES", "ACCOUNTS"])("returns 403 for %s", async (role) => {
    const product = await createTestProduct();
    const po = await createDraftPO([{ productId: product.id, quantity: 1, unitCost: 1 }]);

    const response = await request(app).post(`/purchase-orders/${po.id}/receive`).set(authed(role));

    expect(response.status).toBe(403);
  });
});

describe("POST /purchase-orders/:id/cancel", () => {
  it("cancels a Draft with no stock effect", async () => {
    const product = await createTestProduct({ currentStock: 10 });
    const po = await createDraftPO([{ productId: product.id, quantity: 3, unitCost: 1 }]);

    const response = await request(app)
      .post(`/purchase-orders/${po.id}/cancel`)
      .set(authed("WAREHOUSE"));

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("CANCELLED");

    const refreshedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(refreshedProduct.currentStock).toBe(10);
  });

  it("cancels a Received PO and reverses stock via compensating OUT movements", async () => {
    const product = await createTestProduct({ currentStock: 10 });
    const po = await createDraftPO([{ productId: product.id, quantity: 5, unitCost: 1 }]);
    await request(app).post(`/purchase-orders/${po.id}/receive`).set(authed("WAREHOUSE"));

    const afterReceive = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(afterReceive.currentStock).toBe(15);

    const response = await request(app)
      .post(`/purchase-orders/${po.id}/cancel`)
      .set(authed("ADMIN"));

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("CANCELLED");

    const afterCancel = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(afterCancel.currentStock).toBe(10);

    const reversalMovements = await prisma.stockMovement.findMany({
      where: { sourceType: "PURCHASE_ORDER", sourceId: po.id, type: "OUT" },
    });
    expect(reversalMovements).toHaveLength(1);
    expect(reversalMovements[0].reason).toBe("Purchase order cancelled");
  });

  it("blocks cancelling a Received PO whose stock was already partly consumed, with a clear error", async () => {
    const product = await createTestProduct({ currentStock: 0 });
    const po = await createDraftPO([{ productId: product.id, quantity: 10, unitCost: 1 }]);
    await request(app).post(`/purchase-orders/${po.id}/receive`).set(authed("WAREHOUSE"));

    // Simulate the received stock having been partly sold elsewhere in the
    // meantime (e.g. via a confirmed sales challan) — only 3 of the 10
    // received units remain.
    await prisma.product.update({ where: { id: product.id }, data: { currentStock: 3 } });

    const response = await request(app)
      .post(`/purchase-orders/${po.id}/cancel`)
      .set(authed("WAREHOUSE"));

    expect(response.status).toBe(409);
    expect(response.body.error.message).toContain(product.name);
    expect(response.body.error.details).toEqual([
      {
        productId: product.id,
        productName: product.name,
        requestedQuantity: 10,
        availableQuantity: 3,
      },
    ]);

    // The PO must remain Received and stock must be untouched — the
    // cancellation must not have partially applied.
    const refreshedPO = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: po.id } });
    expect(refreshedPO.status).toBe("RECEIVED");
    const refreshedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(refreshedProduct.currentStock).toBe(3);
  });

  it("rejects cancelling an already-Cancelled PO", async () => {
    const product = await createTestProduct();
    const po = await createDraftPO([{ productId: product.id, quantity: 1, unitCost: 1 }]);
    await request(app).post(`/purchase-orders/${po.id}/cancel`).set(authed("WAREHOUSE"));

    const response = await request(app)
      .post(`/purchase-orders/${po.id}/cancel`)
      .set(authed("WAREHOUSE"));

    expect(response.status).toBe(409);
  });

  it.each(["SALES", "ACCOUNTS"])("returns 403 for %s", async (role) => {
    const product = await createTestProduct();
    const po = await createDraftPO([{ productId: product.id, quantity: 1, unitCost: 1 }]);

    const response = await request(app).post(`/purchase-orders/${po.id}/cancel`).set(authed(role));

    expect(response.status).toBe(403);
  });
});

describe("GET /purchase-orders", () => {
  it("filters by status and searches by PO number/supplier name", async () => {
    const product = await createTestProduct({ currentStock: 50 });
    const po = await createDraftPO([{ productId: product.id, quantity: 1, unitCost: 1 }]);
    await request(app).post(`/purchase-orders/${po.id}/receive`).set(authed("WAREHOUSE"));
    await createDraftPO([{ productId: product.id, quantity: 1, unitCost: 1 }]);

    const byStatus = await request(app)
      .get("/purchase-orders")
      .query({ status: "RECEIVED", search: po.poNumber })
      .set(authed("SALES"));
    expect(byStatus.status).toBe(200);
    expect(byStatus.body.data).toHaveLength(1);
    expect(byStatus.body.data[0].id).toBe(po.id);
  });

  it("returns a paginated envelope", async () => {
    const product = await createTestProduct({ currentStock: 50 });
    const supplierTag = `ZZZ-Test PO Supplier Paginated ${nextTag()}`;
    await request(app)
      .post("/purchase-orders")
      .set(authed("WAREHOUSE"))
      .send({
        supplierName: supplierTag,
        items: [{ productId: product.id, quantity: 1, unitCost: 1 }],
      });
    await request(app)
      .post("/purchase-orders")
      .set(authed("WAREHOUSE"))
      .send({
        supplierName: supplierTag,
        items: [{ productId: product.id, quantity: 1, unitCost: 1 }],
      });

    const response = await request(app)
      .get("/purchase-orders")
      .query({ search: supplierTag, limit: 1, page: 1 })
      .set(authed("ACCOUNTS"));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta.pagination).toMatchObject({ page: 1, limit: 1, total: 2 });
  });
});

describe("GET /purchase-orders/:id", () => {
  it("returns 404 for a non-existent purchase order", async () => {
    const response = await request(app).get("/purchase-orders/does-not-exist").set(authed("ADMIN"));
    expect(response.status).toBe(404);
  });
});
