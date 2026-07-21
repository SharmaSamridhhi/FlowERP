import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../services/user.service.js";

// Real Prisma, real test database — no mocking. Self-seeding
// (beforeAll/afterAll), consistent with FLO-011's auth.route.test.ts.

const TEST_PASSWORD = "Test-Password-123!";

const TEST_USERS = [
  {
    name: "Customer Test Admin",
    email: "customer-test-admin@flowerp.test",
    role: "ADMIN" as const,
  },
  {
    name: "Customer Test Sales",
    email: "customer-test-sales@flowerp.test",
    role: "SALES" as const,
  },
  {
    name: "Customer Test Warehouse",
    email: "customer-test-warehouse@flowerp.test",
    role: "WAREHOUSE" as const,
  },
  {
    name: "Customer Test Accounts",
    email: "customer-test-accounts@flowerp.test",
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
  // Cascades to each customer's follow-ups.
  await prisma.customer.deleteMany({
    where: { createdBy: { email: { in: TEST_USERS.map((u) => u.email) } } },
  });
  await prisma.user.deleteMany({ where: { email: { in: TEST_USERS.map((u) => u.email) } } });
  await prisma.$disconnect();
});

function authed(role: string) {
  return { Authorization: `Bearer ${tokens[role]}` };
}

async function createTestCustomer(overrides: Record<string, unknown> = {}) {
  const response = await request(app)
    .post("/customers")
    .set(authed("ADMIN"))
    .send({
      name: "ZZZ-Test Acme Distribution",
      mobile: "9800000001",
      type: "WHOLESALE",
      ...overrides,
    });
  return response.body.data;
}

describe("POST /customers", () => {
  it("creates a customer and returns 201 with no internal fields", async () => {
    const response = await request(app).post("/customers").set(authed("ADMIN")).send({
      name: "ZZZ-Test Bright Traders",
      mobile: "9800000002",
      email: "bright@zzz-test.example",
      type: "RETAIL",
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      name: "ZZZ-Test Bright Traders",
      mobile: "9800000002",
      email: "bright@zzz-test.example",
      type: "RETAIL",
      status: "LEAD",
    });
    expect(response.body.data).not.toHaveProperty("createdById");
  });

  it("returns 400 when a required field is missing", async () => {
    const response = await request(app)
      .post("/customers")
      .set(authed("ADMIN"))
      .send({ mobile: "9800000003", type: "RETAIL" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for an invalid type enum value", async () => {
    const response = await request(app).post("/customers").set(authed("ADMIN")).send({
      name: "ZZZ-Test Invalid",
      mobile: "9800000004",
      type: "NOT_A_REAL_TYPE",
    });

    expect(response.status).toBe(400);
  });

  it.each(["WAREHOUSE", "ACCOUNTS"])("returns 403 for %s", async (role) => {
    const response = await request(app).post("/customers").set(authed(role)).send({
      name: "ZZZ-Test Should Not Exist",
      mobile: "9800000005",
      type: "RETAIL",
    });

    expect(response.status).toBe(403);
  });
});

describe("GET /customers", () => {
  beforeAll(async () => {
    await createTestCustomer({
      name: "ZZZ-Test Search Alpha",
      mobile: "9811110001",
      email: "alpha@zzz-search.example",
      businessName: "Alpha Traders Pvt Ltd",
      type: "RETAIL",
      status: "LEAD",
    });
    await createTestCustomer({
      name: "ZZZ-Test Search Beta",
      mobile: "9811110002",
      type: "WHOLESALE",
      status: "ACTIVE",
    });
  });

  it("matches search against name", async () => {
    const response = await request(app)
      .get("/customers")
      .query({ search: "ZZZ-Test Search Alpha" })
      .set(authed("SALES"));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe("ZZZ-Test Search Alpha");
  });

  it("matches search against mobile, email, and business name", async () => {
    const byMobile = await request(app)
      .get("/customers")
      .query({ search: "9811110002" })
      .set(authed("SALES"));
    expect(byMobile.body.data).toHaveLength(1);

    const byEmail = await request(app)
      .get("/customers")
      .query({ search: "alpha@zzz-search.example" })
      .set(authed("SALES"));
    expect(byEmail.body.data).toHaveLength(1);

    const byBusinessName = await request(app)
      .get("/customers")
      .query({ search: "alpha traders" })
      .set(authed("SALES"));
    expect(byBusinessName.body.data).toHaveLength(1);
  });

  it("filters by type and status together", async () => {
    const response = await request(app)
      .get("/customers")
      .query({ search: "ZZZ-Test Search", type: "WHOLESALE", status: "ACTIVE" })
      .set(authed("WAREHOUSE"));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe("ZZZ-Test Search Beta");
  });

  it("returns a paginated envelope", async () => {
    const response = await request(app)
      .get("/customers")
      .query({ search: "ZZZ-Test Search", limit: 1, page: 1 })
      .set(authed("ACCOUNTS"));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta.pagination).toEqual({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2,
    });
  });
});

describe("GET /customers/:id", () => {
  it("returns full detail with an empty follow-up list for a new customer", async () => {
    const customer = await createTestCustomer({ name: "ZZZ-Test Detail Target" });

    const response = await request(app).get(`/customers/${customer.id}`).set(authed("ACCOUNTS"));

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe("ZZZ-Test Detail Target");
    expect(response.body.data.followUps).toEqual([]);
  });

  it("returns 404 for a non-existent customer", async () => {
    const response = await request(app).get("/customers/does-not-exist").set(authed("ADMIN"));

    expect(response.status).toBe(404);
  });
});

describe("PATCH /customers/:id", () => {
  it("updates only the provided fields, leaving the rest untouched", async () => {
    const customer = await createTestCustomer({
      name: "ZZZ-Test Partial Update",
      businessName: "Original Business Name",
      status: "LEAD",
    });

    const response = await request(app)
      .patch(`/customers/${customer.id}`)
      .set(authed("SALES"))
      .send({ status: "ACTIVE" });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("ACTIVE");
    expect(response.body.data.businessName).toBe("Original Business Name");
    expect(response.body.data.name).toBe("ZZZ-Test Partial Update");
  });

  it("returns 403 for WAREHOUSE", async () => {
    const customer = await createTestCustomer({ name: "ZZZ-Test No Edit" });

    const response = await request(app)
      .patch(`/customers/${customer.id}`)
      .set(authed("WAREHOUSE"))
      .send({ status: "ACTIVE" });

    expect(response.status).toBe(403);
  });
});

describe("POST /customers/:id/follow-ups", () => {
  it("appends a note attributed to the author and does not overwrite prior notes", async () => {
    const customer = await createTestCustomer({ name: "ZZZ-Test Follow Up Target" });

    await request(app)
      .post(`/customers/${customer.id}/follow-ups`)
      .set(authed("SALES"))
      .send({ note: "First contact made" });

    const second = await request(app)
      .post(`/customers/${customer.id}/follow-ups`)
      .set(authed("ADMIN"))
      .send({ note: "Second contact made", followUpDate: "2026-09-01" });

    expect(second.status).toBe(201);
    expect(second.body.data.note).toBe("Second contact made");
    expect(second.body.data.authorName).toBe("Customer Test Admin");

    const detail = await request(app).get(`/customers/${customer.id}`).set(authed("ADMIN"));

    expect(detail.body.data.followUps).toHaveLength(2);
    // Most-recent-first.
    expect(detail.body.data.followUps[0].note).toBe("Second contact made");
    expect(detail.body.data.followUps[1].note).toBe("First contact made");
    expect(detail.body.data.followUpDate).toBe("2026-09-01T00:00:00.000Z");
  });

  it("returns 403 for ACCOUNTS", async () => {
    const customer = await createTestCustomer({ name: "ZZZ-Test No Follow Up" });

    const response = await request(app)
      .post(`/customers/${customer.id}/follow-ups`)
      .set(authed("ACCOUNTS"))
      .send({ note: "Should be rejected" });

    expect(response.status).toBe(403);
  });
});
