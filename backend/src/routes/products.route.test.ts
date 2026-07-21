import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../services/user.service.js";

// Real Prisma, real test database — no mocking. Self-seeding
// (beforeAll/afterAll), consistent with FLO-012's customers.route.test.ts.

const TEST_PASSWORD = "Test-Password-123!";

const TEST_USERS = [
  { name: "Product Test Admin", email: "product-test-admin@flowerp.test", role: "ADMIN" as const },
  { name: "Product Test Sales", email: "product-test-sales@flowerp.test", role: "SALES" as const },
  {
    name: "Product Test Warehouse",
    email: "product-test-warehouse@flowerp.test",
    role: "WAREHOUSE" as const,
  },
  {
    name: "Product Test Accounts",
    email: "product-test-accounts@flowerp.test",
    role: "ACCOUNTS" as const,
  },
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
  // StockMovement -> Product is onDelete: Restrict, so movements must be
  // cleared before their products.
  await prisma.stockMovement.deleteMany({
    where: { product: { sku: { startsWith: "ZZZ-TEST-" } } },
  });
  await prisma.product.deleteMany({ where: { sku: { startsWith: "ZZZ-TEST-" } } });
  await prisma.user.deleteMany({ where: { email: { in: TEST_USERS.map((u) => u.email) } } });
  await prisma.$disconnect();
});

function authed(role: string) {
  return { Authorization: `Bearer ${tokens[role]}` };
}

let skuCounter = 0;
function nextSku(): string {
  skuCounter += 1;
  return `ZZZ-TEST-${skuCounter}`;
}

async function createTestProduct(overrides: Record<string, unknown> = {}) {
  const response = await request(app)
    .post("/products")
    .set(authed("ADMIN"))
    .send({
      name: "ZZZ-Test Widget",
      sku: nextSku(),
      category: "Hardware",
      unitPrice: 10,
      minStockAlertQuantity: 5,
      ...overrides,
    });
  return response.body.data;
}

describe("POST /products", () => {
  it("creates a product and returns 201", async () => {
    const sku = nextSku();
    const response = await request(app).post("/products").set(authed("ADMIN")).send({
      name: "ZZZ-Test Bolt",
      sku,
      category: "Hardware",
      unitPrice: 4.5,
      minStockAlertQuantity: 10,
      location: "Warehouse A",
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      name: "ZZZ-Test Bolt",
      sku,
      category: "Hardware",
      unitPrice: 4.5,
      currentStock: 0,
      minStockAlertQuantity: 10,
      location: "Warehouse A",
      isLowStock: true,
    });
  });

  it("returns 400 when a required field is missing", async () => {
    const response = await request(app)
      .post("/products")
      .set(authed("ADMIN"))
      .send({ sku: nextSku(), category: "Hardware", unitPrice: 1, minStockAlertQuantity: 1 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for a negative unit price", async () => {
    const response = await request(app).post("/products").set(authed("ADMIN")).send({
      name: "ZZZ-Test Invalid",
      sku: nextSku(),
      category: "Hardware",
      unitPrice: -1,
      minStockAlertQuantity: 1,
    });

    expect(response.status).toBe(400);
  });

  it("returns 409 for a duplicate SKU", async () => {
    const sku = nextSku();
    await createTestProduct({ sku });

    const response = await request(app).post("/products").set(authed("ADMIN")).send({
      name: "ZZZ-Test Duplicate",
      sku,
      category: "Hardware",
      unitPrice: 1,
      minStockAlertQuantity: 1,
    });

    expect(response.status).toBe(409);
  });

  it.each(["SALES", "ACCOUNTS"])("returns 403 for %s", async (role) => {
    const response = await request(app).post("/products").set(authed(role)).send({
      name: "ZZZ-Test Should Not Exist",
      sku: nextSku(),
      category: "Hardware",
      unitPrice: 1,
      minStockAlertQuantity: 1,
    });

    expect(response.status).toBe(403);
  });
});

describe("GET /products", () => {
  beforeAll(async () => {
    await createTestProduct({
      name: "ZZZ-Test Search Alpha",
      category: "Electronics",
      unitPrice: 20,
      minStockAlertQuantity: 5,
    });
    await prisma.product.updateMany({
      where: { name: "ZZZ-Test Search Alpha" },
      data: { currentStock: 2 },
    });

    await createTestProduct({
      name: "ZZZ-Test Search Beta",
      category: "Hardware",
      unitPrice: 30,
      minStockAlertQuantity: 5,
    });
    await prisma.product.updateMany({
      where: { name: "ZZZ-Test Search Beta" },
      data: { currentStock: 50 },
    });
  });

  it("matches search against name", async () => {
    const response = await request(app)
      .get("/products")
      .query({ search: "ZZZ-Test Search Alpha" })
      .set(authed("SALES"));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe("ZZZ-Test Search Alpha");
  });

  it("matches search against sku", async () => {
    const product = await createTestProduct({ name: "ZZZ-Test Sku Match" });

    const response = await request(app)
      .get("/products")
      .query({ search: product.sku })
      .set(authed("WAREHOUSE"));

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].sku).toBe(product.sku);
  });

  it("filters by category", async () => {
    const response = await request(app)
      .get("/products")
      .query({ search: "ZZZ-Test Search", category: "Electronics" })
      .set(authed("ACCOUNTS"));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe("ZZZ-Test Search Alpha");
  });

  it("filters by lowStock=true", async () => {
    const response = await request(app)
      .get("/products")
      .query({ search: "ZZZ-Test Search", lowStock: "true" })
      .set(authed("ADMIN"));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe("ZZZ-Test Search Alpha");
    expect(response.body.data[0].isLowStock).toBe(true);
  });

  it("returns a paginated envelope", async () => {
    const response = await request(app)
      .get("/products")
      .query({ search: "ZZZ-Test Search", limit: 1, page: 1 })
      .set(authed("ACCOUNTS"));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta.pagination).toMatchObject({ page: 1, limit: 1, total: 2 });
  });
});

describe("GET /products/:id", () => {
  it("returns full detail including isLowStock", async () => {
    const product = await createTestProduct({ name: "ZZZ-Test Detail Target" });

    const response = await request(app).get(`/products/${product.id}`).set(authed("ACCOUNTS"));

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe("ZZZ-Test Detail Target");
    expect(response.body.data.isLowStock).toBe(true);
  });

  it("returns 404 for a non-existent product", async () => {
    const response = await request(app).get("/products/does-not-exist").set(authed("ADMIN"));

    expect(response.status).toBe(404);
  });
});

describe("PATCH /products/:id", () => {
  it("updates editable fields, leaving the rest untouched", async () => {
    const product = await createTestProduct({
      name: "ZZZ-Test Partial Update",
      category: "Hardware",
    });

    const response = await request(app)
      .patch(`/products/${product.id}`)
      .set(authed("WAREHOUSE"))
      .send({ category: "Electronics" });

    expect(response.status).toBe(200);
    expect(response.body.data.category).toBe("Electronics");
    expect(response.body.data.name).toBe("ZZZ-Test Partial Update");
  });

  it("does not allow currentStock to be set through this endpoint", async () => {
    const product = await createTestProduct({ name: "ZZZ-Test Stock Guard" });

    const response = await request(app)
      .patch(`/products/${product.id}`)
      .set(authed("ADMIN"))
      .send({ currentStock: 9999 });

    expect(response.status).toBe(200);
    expect(response.body.data.currentStock).toBe(0);
  });

  it("returns 403 for SALES", async () => {
    const product = await createTestProduct({ name: "ZZZ-Test No Edit" });

    const response = await request(app)
      .patch(`/products/${product.id}`)
      .set(authed("SALES"))
      .send({ category: "Electronics" });

    expect(response.status).toBe(403);
  });
});

describe("POST /products/:id/stock-movements", () => {
  it("records a manual IN adjustment and updates currentStock", async () => {
    const product = await createTestProduct({ name: "ZZZ-Test Manual IN" });

    const response = await request(app)
      .post(`/products/${product.id}/stock-movements`)
      .set(authed("WAREHOUSE"))
      .send({ quantity: 20, type: "IN", reason: "Stock count correction" });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      quantity: 20,
      type: "IN",
      reason: "Stock count correction",
      sourceType: "MANUAL",
    });

    const detail = await request(app).get(`/products/${product.id}`).set(authed("ADMIN"));
    expect(detail.body.data.currentStock).toBe(20);
  });

  it("returns 409 for an OUT adjustment that would take stock negative", async () => {
    const product = await createTestProduct({ name: "ZZZ-Test Manual OUT Guard" });

    const response = await request(app)
      .post(`/products/${product.id}/stock-movements`)
      .set(authed("ADMIN"))
      .send({ quantity: 5, type: "OUT", reason: "Damaged goods" });

    expect(response.status).toBe(409);
  });

  it("returns 400 when reason is missing", async () => {
    const product = await createTestProduct({ name: "ZZZ-Test Missing Reason" });

    const response = await request(app)
      .post(`/products/${product.id}/stock-movements`)
      .set(authed("ADMIN"))
      .send({ quantity: 5, type: "IN" });

    expect(response.status).toBe(400);
  });

  it.each(["SALES", "ACCOUNTS"])("returns 403 for %s", async (role) => {
    const product = await createTestProduct({ name: "ZZZ-Test Manual Forbidden" });

    const response = await request(app)
      .post(`/products/${product.id}/stock-movements`)
      .set(authed(role))
      .send({ quantity: 5, type: "IN", reason: "Restock" });

    expect(response.status).toBe(403);
  });
});

describe("GET /products/:id/stock-movements", () => {
  it("returns entries most-recent-first, paginated, with all required fields", async () => {
    const product = await createTestProduct({ name: "ZZZ-Test Ledger List" });

    await request(app)
      .post(`/products/${product.id}/stock-movements`)
      .set(authed("ADMIN"))
      .send({ quantity: 10, type: "IN", reason: "Initial stock" });
    await request(app)
      .post(`/products/${product.id}/stock-movements`)
      .set(authed("WAREHOUSE"))
      .send({ quantity: 3, type: "OUT", reason: "Damaged goods" });

    const response = await request(app)
      .get(`/products/${product.id}/stock-movements`)
      .set(authed("ACCOUNTS"));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0]).toMatchObject({
      quantity: 3,
      type: "OUT",
      reason: "Damaged goods",
    });
    expect(response.body.data[0].createdByName).toBe("Product Test Warehouse");
    expect(response.body.data[1]).toMatchObject({ quantity: 10, type: "IN" });
    expect(response.body.meta.pagination).toMatchObject({ page: 1, limit: 20, total: 2 });
  });

  it("returns 404 for a non-existent product", async () => {
    const response = await request(app)
      .get("/products/does-not-exist/stock-movements")
      .set(authed("ADMIN"));

    expect(response.status).toBe(404);
  });
});
