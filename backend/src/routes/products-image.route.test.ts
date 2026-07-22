import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// S3 SDK mocked — no real AWS call is ever made in this suite. See
// specs/FLO-024-product-image-s3.md's acceptance criteria.
const mockSend = vi.fn().mockResolvedValue({});

vi.mock("@aws-sdk/client-s3", () => {
  class FakeCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  return {
    S3Client: vi.fn().mockImplementation(function S3ClientMock() {
      return { send: mockSend };
    }),
    PutObjectCommand: FakeCommand,
    HeadObjectCommand: FakeCommand,
    DeleteObjectCommand: FakeCommand,
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi
    .fn()
    .mockResolvedValue("https://flowerp-test-bucket.s3.us-east-1.amazonaws.com/signed-put-url"),
}));

const { default: app } = await import("../app.js");
const { prisma } = await import("../lib/prisma.js");
const { hashPassword } = await import("../services/user.service.js");

const TEST_PASSWORD = "Test-Password-123!";

const TEST_USERS = [
  { name: "Image Test Admin", email: "image-test-admin@flowerp.test", role: "ADMIN" as const },
  { name: "Image Test Sales", email: "image-test-sales@flowerp.test", role: "SALES" as const },
  {
    name: "Image Test Warehouse",
    email: "image-test-warehouse@flowerp.test",
    role: "WAREHOUSE" as const,
  },
  {
    name: "Image Test Accounts",
    email: "image-test-accounts@flowerp.test",
    role: "ACCOUNTS" as const,
  },
];

const tokens: Record<string, string> = {};
let testProductId: string;

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

  const product = await prisma.product.create({
    data: {
      name: "ZZZ-Test Image Route Widget",
      sku: `ZZZ-TEST-IMGRT-${Date.now()}`,
      category: "Hardware",
      unitPrice: 10,
      minStockAlertQuantity: 0,
    },
  });
  testProductId = product.id;
});

afterAll(async () => {
  await prisma.product.deleteMany({ where: { sku: { startsWith: "ZZZ-TEST-IMGRT-" } } });
  await prisma.user.deleteMany({ where: { email: { in: TEST_USERS.map((u) => u.email) } } });
  await prisma.$disconnect();
});

function authed(role: string) {
  return { Authorization: `Bearer ${tokens[role]}` };
}

describe("POST /products/:id/image-upload-url", () => {
  it("returns a presigned upload URL for ADMIN", async () => {
    const response = await request(app)
      .post(`/products/${testProductId}/image-upload-url`)
      .set(authed("ADMIN"))
      .send({ contentType: "image/jpeg", fileSizeBytes: 1024 });

    expect(response.status).toBe(201);
    expect(response.body.data.objectKey).toMatch(new RegExp(`^products/${testProductId}/`));
    expect(response.body.data.uploadUrl).toContain("https://");
  });

  it("rejects an unsupported content type with 400", async () => {
    const response = await request(app)
      .post(`/products/${testProductId}/image-upload-url`)
      .set(authed("ADMIN"))
      .send({ contentType: "application/pdf", fileSizeBytes: 1024 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a file over the 5MB limit with 400", async () => {
    const response = await request(app)
      .post(`/products/${testProductId}/image-upload-url`)
      .set(authed("ADMIN"))
      .send({ contentType: "image/jpeg", fileSizeBytes: 6 * 1024 * 1024 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 for a non-existent product", async () => {
    const response = await request(app)
      .post("/products/does-not-exist/image-upload-url")
      .set(authed("ADMIN"))
      .send({ contentType: "image/jpeg", fileSizeBytes: 1024 });

    expect(response.status).toBe(404);
  });

  it.each(["SALES", "ACCOUNTS"])("returns 403 for %s", async (role) => {
    const response = await request(app)
      .post(`/products/${testProductId}/image-upload-url`)
      .set(authed(role))
      .send({ contentType: "image/jpeg", fileSizeBytes: 1024 });

    expect(response.status).toBe(403);
  });
});

describe("POST /products/:id/image", () => {
  it("confirms the upload and persists imageUrl for WAREHOUSE", async () => {
    const objectKey = `products/${testProductId}/${randomUUID()}.jpg`;
    const response = await request(app)
      .post(`/products/${testProductId}/image`)
      .set(authed("WAREHOUSE"))
      .send({ objectKey });

    expect(response.status).toBe(200);
    expect(response.body.data.imageUrl).toContain(objectKey);
  });

  it("rejects an object key scoped to a different product with 400", async () => {
    const response = await request(app)
      .post(`/products/${testProductId}/image`)
      .set(authed("ADMIN"))
      .send({ objectKey: `products/some-other-product/${randomUUID()}.jpg` });

    expect(response.status).toBe(400);
  });

  it.each(["SALES", "ACCOUNTS"])("returns 403 for %s", async (role) => {
    const response = await request(app)
      .post(`/products/${testProductId}/image`)
      .set(authed(role))
      .send({ objectKey: `products/${testProductId}/${randomUUID()}.jpg` });

    expect(response.status).toBe(403);
  });
});
