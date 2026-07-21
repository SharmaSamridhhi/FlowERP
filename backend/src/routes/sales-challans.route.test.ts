import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../services/user.service.js";

// Real Prisma, real test database — no mocking. Self-seeding
// (beforeAll/afterAll), consistent with FLO-012/013's route tests.

const TEST_PASSWORD = "Test-Password-123!";

const TEST_USERS = [
  { name: "Challan Test Admin", email: "challan-test-admin@flowerp.test", role: "ADMIN" as const },
  { name: "Challan Test Sales", email: "challan-test-sales@flowerp.test", role: "SALES" as const },
  {
    name: "Challan Test Warehouse",
    email: "challan-test-warehouse@flowerp.test",
    role: "WAREHOUSE" as const,
  },
  {
    name: "Challan Test Accounts",
    email: "challan-test-accounts@flowerp.test",
    role: "ACCOUNTS" as const,
  },
];

const tokens: Record<string, string> = {};
let adminUserId: string;

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

  adminUserId = (
    await prisma.user.findUniqueOrThrow({
      where: { email: "challan-test-admin@flowerp.test" },
    })
  ).id;
});

afterAll(async () => {
  // Deletion order respects onDelete: Restrict on Product/Customer/User —
  // challans (and their cascaded items) and stock movements must go first.
  // Movements/challans can be authored by any of the four test users
  // (whichever role confirmed/cancelled), so scope by product/customer
  // instead of a single creator id.
  await prisma.salesChallan.deleteMany({
    where: { customer: { name: { startsWith: "ZZZ-Test Challan" } } },
  });
  await prisma.stockMovement.deleteMany({
    where: { product: { sku: { startsWith: "ZZZ-CHALLAN-TEST-" } } },
  });
  await prisma.product.deleteMany({ where: { sku: { startsWith: "ZZZ-CHALLAN-TEST-" } } });
  await prisma.customer.deleteMany({ where: { name: { startsWith: "ZZZ-Test Challan" } } });
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

async function createTestCustomer() {
  return prisma.customer.create({
    data: {
      name: `ZZZ-Test Challan Customer ${nextTag()}`,
      mobile: "9800000000",
      type: "RETAIL",
      createdById: adminUserId,
    },
  });
}

async function createTestProduct(overrides: { currentStock?: number; unitPrice?: number } = {}) {
  return prisma.product.create({
    data: {
      name: `ZZZ-Test Challan Product ${nextTag()}`,
      sku: `ZZZ-CHALLAN-TEST-${nextTag()}`,
      category: "Hardware",
      unitPrice: overrides.unitPrice ?? 10,
      currentStock: overrides.currentStock ?? 100,
      minStockAlertQuantity: 0,
    },
  });
}

async function createDraftChallan(
  customerId: string,
  items: { productId: string; quantity: number }[],
) {
  const response = await request(app)
    .post("/challans")
    .set(authed("SALES"))
    .send({ customerId, items });
  return response.body.data as { id: string; challanNumber: string };
}

describe("POST /challans", () => {
  it("creates a Draft challan with an auto-generated number, snapshot data, and no stock effect", async () => {
    const customer = await createTestCustomer();
    const product = await createTestProduct({ currentStock: 50, unitPrice: 12.5 });

    const response = await request(app)
      .post("/challans")
      .set(authed("SALES"))
      .send({ customerId: customer.id, items: [{ productId: product.id, quantity: 3 }] });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe("DRAFT");
    expect(response.body.data.challanNumber).toMatch(/^CH-\d{4}-\d{6}$/);
    expect(response.body.data.totalQuantity).toBe(3);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0]).toMatchObject({
      productId: product.id,
      productNameSnapshot: product.name,
      productSkuSnapshot: product.sku,
      unitPriceSnapshot: 12.5,
      quantity: 3,
    });

    const refreshedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(refreshedProduct.currentStock).toBe(50);
  });

  it("generates unique challan numbers under concurrent creation", async () => {
    const customer = await createTestCustomer();
    const product = await createTestProduct();

    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app)
          .post("/challans")
          .set(authed("SALES"))
          .send({ customerId: customer.id, items: [{ productId: product.id, quantity: 1 }] }),
      ),
    );

    expect(responses.every((r) => r.status === 201)).toBe(true);
    const numbers = responses.map((r) => r.body.data.challanNumber as string);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("returns 400 when items is empty", async () => {
    const customer = await createTestCustomer();

    const response = await request(app)
      .post("/challans")
      .set(authed("SALES"))
      .send({ customerId: customer.id, items: [] });

    expect(response.status).toBe(400);
  });

  it("returns 404 for a non-existent product", async () => {
    const customer = await createTestCustomer();

    const response = await request(app)
      .post("/challans")
      .set(authed("ADMIN"))
      .send({ customerId: customer.id, items: [{ productId: "does-not-exist", quantity: 1 }] });

    expect(response.status).toBe(404);
  });

  it.each(["WAREHOUSE", "ACCOUNTS"])("returns 403 for %s", async (role) => {
    const customer = await createTestCustomer();
    const product = await createTestProduct();

    const response = await request(app)
      .post("/challans")
      .set(authed(role))
      .send({ customerId: customer.id, items: [{ productId: product.id, quantity: 1 }] });

    expect(response.status).toBe(403);
  });
});

describe("PATCH /challans/:id", () => {
  it("re-snapshots line items on a Draft", async () => {
    const customer = await createTestCustomer();
    const productA = await createTestProduct({ unitPrice: 5 });
    const productB = await createTestProduct({ unitPrice: 8 });
    const challan = await createDraftChallan(customer.id, [
      { productId: productA.id, quantity: 2 },
    ]);

    const response = await request(app)
      .patch(`/challans/${challan.id}`)
      .set(authed("SALES"))
      .send({ items: [{ productId: productB.id, quantity: 4 }] });

    expect(response.status).toBe(200);
    expect(response.body.data.totalQuantity).toBe(4);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0]).toMatchObject({
      productId: productB.id,
      unitPriceSnapshot: 8,
      quantity: 4,
    });
  });

  it("rejects editing a Confirmed challan", async () => {
    const customer = await createTestCustomer();
    const product = await createTestProduct({ currentStock: 20 });
    const challan = await createDraftChallan(customer.id, [{ productId: product.id, quantity: 1 }]);
    await request(app).post(`/challans/${challan.id}/confirm`).set(authed("SALES"));

    const response = await request(app)
      .patch(`/challans/${challan.id}`)
      .set(authed("SALES"))
      .send({ items: [{ productId: product.id, quantity: 2 }] });

    expect(response.status).toBe(409);
  });
});

describe("POST /challans/:id/confirm", () => {
  it("deducts stock for every line item atomically when stock is sufficient", async () => {
    const customer = await createTestCustomer();
    const productA = await createTestProduct({ currentStock: 10 });
    const productB = await createTestProduct({ currentStock: 20 });
    const challan = await createDraftChallan(customer.id, [
      { productId: productA.id, quantity: 4 },
      { productId: productB.id, quantity: 5 },
    ]);

    const response = await request(app)
      .post(`/challans/${challan.id}/confirm`)
      .set(authed("SALES"));

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("CONFIRMED");

    const refreshedA = await prisma.product.findUniqueOrThrow({ where: { id: productA.id } });
    const refreshedB = await prisma.product.findUniqueOrThrow({ where: { id: productB.id } });
    expect(refreshedA.currentStock).toBe(6);
    expect(refreshedB.currentStock).toBe(15);

    const movements = await prisma.stockMovement.findMany({
      where: { sourceType: "CHALLAN", sourceId: challan.id },
    });
    expect(movements).toHaveLength(2);
    expect(movements.every((m) => m.type === "OUT")).toBe(true);
  });

  it("rejects confirm with insufficient stock, touching zero stock movements and leaving status Draft", async () => {
    const customer = await createTestCustomer();
    const sufficientProduct = await createTestProduct({ currentStock: 10 });
    const shortProduct = await createTestProduct({ currentStock: 2 });
    const challan = await createDraftChallan(customer.id, [
      { productId: sufficientProduct.id, quantity: 3 },
      { productId: shortProduct.id, quantity: 5 },
    ]);

    const response = await request(app)
      .post(`/challans/${challan.id}/confirm`)
      .set(authed("SALES"));

    expect(response.status).toBe(409);
    expect(response.body.error.message).toContain(shortProduct.name);
    expect(response.body.error.details).toEqual([
      {
        productId: shortProduct.id,
        productName: shortProduct.name,
        requestedQuantity: 5,
        availableQuantity: 2,
      },
    ]);

    const refreshedSufficient = await prisma.product.findUniqueOrThrow({
      where: { id: sufficientProduct.id },
    });
    const refreshedShort = await prisma.product.findUniqueOrThrow({
      where: { id: shortProduct.id },
    });
    expect(refreshedSufficient.currentStock).toBe(10);
    expect(refreshedShort.currentStock).toBe(2);

    const movements = await prisma.stockMovement.findMany({
      where: { sourceType: "CHALLAN", sourceId: challan.id },
    });
    expect(movements).toHaveLength(0);

    const refreshedChallan = await prisma.salesChallan.findUniqueOrThrow({
      where: { id: challan.id },
    });
    expect(refreshedChallan.status).toBe("DRAFT");
  });

  it("rejects confirming an already-Confirmed challan", async () => {
    const customer = await createTestCustomer();
    const product = await createTestProduct({ currentStock: 20 });
    const challan = await createDraftChallan(customer.id, [{ productId: product.id, quantity: 1 }]);
    await request(app).post(`/challans/${challan.id}/confirm`).set(authed("SALES"));

    const response = await request(app)
      .post(`/challans/${challan.id}/confirm`)
      .set(authed("SALES"));

    expect(response.status).toBe(409);
  });

  it("rejects confirming a Cancelled challan", async () => {
    const customer = await createTestCustomer();
    const product = await createTestProduct({ currentStock: 20 });
    const challan = await createDraftChallan(customer.id, [{ productId: product.id, quantity: 1 }]);
    await request(app).post(`/challans/${challan.id}/cancel`).set(authed("SALES"));

    const response = await request(app)
      .post(`/challans/${challan.id}/confirm`)
      .set(authed("SALES"));

    expect(response.status).toBe(409);
  });

  it("only one of two concurrently confirmed challans over-committing the same product succeeds", async () => {
    const customer = await createTestCustomer();
    const product = await createTestProduct({ currentStock: 10 });
    const challanA = await createDraftChallan(customer.id, [
      { productId: product.id, quantity: 6 },
    ]);
    const challanB = await createDraftChallan(customer.id, [
      { productId: product.id, quantity: 6 },
    ]);

    const [responseA, responseB] = await Promise.all([
      request(app).post(`/challans/${challanA.id}/confirm`).set(authed("SALES")),
      request(app).post(`/challans/${challanB.id}/confirm`).set(authed("SALES")),
    ]);

    const statuses = [responseA.status, responseB.status].sort();
    expect(statuses).toEqual([200, 409]);

    const refreshedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(refreshedProduct.currentStock).toBe(4);
  });

  it.each(["WAREHOUSE", "ACCOUNTS"])("returns 403 for %s", async (role) => {
    const customer = await createTestCustomer();
    const product = await createTestProduct({ currentStock: 20 });
    const challan = await createDraftChallan(customer.id, [{ productId: product.id, quantity: 1 }]);

    const response = await request(app).post(`/challans/${challan.id}/confirm`).set(authed(role));

    expect(response.status).toBe(403);
  });
});

describe("POST /challans/:id/cancel", () => {
  it("cancels a Draft with no stock effect", async () => {
    const customer = await createTestCustomer();
    const product = await createTestProduct({ currentStock: 20 });
    const challan = await createDraftChallan(customer.id, [{ productId: product.id, quantity: 3 }]);

    const response = await request(app).post(`/challans/${challan.id}/cancel`).set(authed("SALES"));

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("CANCELLED");

    const refreshedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(refreshedProduct.currentStock).toBe(20);
  });

  it("cancels a Confirmed challan and reverses stock via compensating IN movements", async () => {
    const customer = await createTestCustomer();
    const product = await createTestProduct({ currentStock: 20 });
    const challan = await createDraftChallan(customer.id, [{ productId: product.id, quantity: 5 }]);
    await request(app).post(`/challans/${challan.id}/confirm`).set(authed("SALES"));

    const afterConfirm = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(afterConfirm.currentStock).toBe(15);

    const response = await request(app).post(`/challans/${challan.id}/cancel`).set(authed("ADMIN"));

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("CANCELLED");

    const afterCancel = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(afterCancel.currentStock).toBe(20);

    const reversalMovements = await prisma.stockMovement.findMany({
      where: { sourceType: "CHALLAN", sourceId: challan.id, type: "IN" },
    });
    expect(reversalMovements).toHaveLength(1);
    expect(reversalMovements[0].reason).toBe("Challan cancelled");
  });

  it("rejects cancelling an already-Cancelled challan", async () => {
    const customer = await createTestCustomer();
    const product = await createTestProduct({ currentStock: 20 });
    const challan = await createDraftChallan(customer.id, [{ productId: product.id, quantity: 1 }]);
    await request(app).post(`/challans/${challan.id}/cancel`).set(authed("SALES"));

    const response = await request(app).post(`/challans/${challan.id}/cancel`).set(authed("SALES"));

    expect(response.status).toBe(409);
  });

  it.each(["WAREHOUSE", "ACCOUNTS"])("returns 403 for %s", async (role) => {
    const customer = await createTestCustomer();
    const product = await createTestProduct({ currentStock: 20 });
    const challan = await createDraftChallan(customer.id, [{ productId: product.id, quantity: 1 }]);

    const response = await request(app).post(`/challans/${challan.id}/cancel`).set(authed(role));

    expect(response.status).toBe(403);
  });
});

describe("GET /challans", () => {
  it("filters by status and customer, and searches by challan number", async () => {
    const customerA = await createTestCustomer();
    const customerB = await createTestCustomer();
    const product = await createTestProduct({ currentStock: 50 });

    const challanA = await createDraftChallan(customerA.id, [
      { productId: product.id, quantity: 1 },
    ]);
    await createDraftChallan(customerB.id, [{ productId: product.id, quantity: 1 }]);
    await request(app).post(`/challans/${challanA.id}/confirm`).set(authed("SALES"));

    const byStatus = await request(app)
      .get("/challans")
      .query({ status: "CONFIRMED", customerId: customerA.id })
      .set(authed("WAREHOUSE"));
    expect(byStatus.status).toBe(200);
    expect(byStatus.body.data).toHaveLength(1);
    expect(byStatus.body.data[0].id).toBe(challanA.id);

    const bySearch = await request(app)
      .get("/challans")
      .query({ search: challanA.challanNumber })
      .set(authed("ACCOUNTS"));
    expect(bySearch.body.data).toHaveLength(1);
    expect(bySearch.body.data[0].challanNumber).toBe(challanA.challanNumber);
  });

  it("returns a paginated envelope", async () => {
    const customer = await createTestCustomer();
    const product = await createTestProduct({ currentStock: 50 });
    await createDraftChallan(customer.id, [{ productId: product.id, quantity: 1 }]);
    await createDraftChallan(customer.id, [{ productId: product.id, quantity: 1 }]);

    const response = await request(app)
      .get("/challans")
      .query({ customerId: customer.id, limit: 1, page: 1 })
      .set(authed("ACCOUNTS"));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta.pagination).toMatchObject({ page: 1, limit: 1, total: 2 });
  });
});

describe("GET /challans/:id", () => {
  it("returns 404 for a non-existent challan", async () => {
    const response = await request(app).get("/challans/does-not-exist").set(authed("ADMIN"));
    expect(response.status).toBe(404);
  });
});
