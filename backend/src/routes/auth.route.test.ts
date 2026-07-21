import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../services/user.service.js";

// Real Prisma, real bcrypt, real JWT — no mocking. See
// specs/FLO-011-auth-rbac.md's Implementation Notes: auth correctness is
// exactly the kind of logic that's dangerous to test only against mocks.
// Self-seeding (beforeAll/afterAll) so this suite doesn't depend on
// prisma/seed.ts having been run first.

const TEST_PASSWORD = "Test-Password-123!";

const TEST_USERS = [
  { name: "Test Admin", email: "test-admin@flowerp.test", role: "ADMIN" as const },
  { name: "Test Sales", email: "test-sales@flowerp.test", role: "SALES" as const },
  { name: "Test Warehouse", email: "test-warehouse@flowerp.test", role: "WAREHOUSE" as const },
  { name: "Test Accounts", email: "test-accounts@flowerp.test", role: "ACCOUNTS" as const },
];

beforeAll(async () => {
  const passwordHash = await hashPassword(TEST_PASSWORD);
  for (const user of TEST_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, passwordHash },
      create: { ...user, passwordHash },
    });
  }
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: TEST_USERS.map((u) => u.email) } } });
  await prisma.$disconnect();
});

describe("POST /auth/login", () => {
  it.each(TEST_USERS)(
    "logs in as $role and returns a token and profile with no password hash",
    async (user) => {
      const response = await request(app)
        .post("/auth/login")
        .send({ email: user.email, password: TEST_PASSWORD });

      expect(response.status).toBe(200);
      expect(response.body.data.token).toEqual(expect.any(String));
      expect(response.body.data.user).toEqual({
        id: expect.any(String),
        name: user.name,
        email: user.email,
        role: user.role,
      });
      expect(response.body.data.user).not.toHaveProperty("passwordHash");
      expect(JSON.stringify(response.body)).not.toContain(TEST_PASSWORD);
    },
  );

  it("returns 401 for a wrong password", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({ email: TEST_USERS[0]!.email, password: "wrong-password" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 for an unknown email (not a distinguishable 404)", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@flowerp.test", password: TEST_PASSWORD });

    expect(response.status).toBe(401);
  });

  it("returns 400 for a malformed request body", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({ email: "not-an-email", password: "" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /auth/me", () => {
  it("returns the current user's profile for a valid token", async () => {
    const loginResponse = await request(app)
      .post("/auth/login")
      .send({ email: TEST_USERS[0]!.email, password: TEST_PASSWORD });
    const token: string = loginResponse.body.data.token;

    const response = await request(app).get("/auth/me").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      id: expect.any(String),
      name: TEST_USERS[0]!.name,
      email: TEST_USERS[0]!.email,
      role: TEST_USERS[0]!.role,
    });
  });

  it("returns 401 with no token", async () => {
    const response = await request(app).get("/auth/me");

    expect(response.status).toBe(401);
  });

  it("returns 401 with an invalid token", async () => {
    const response = await request(app).get("/auth/me").set("Authorization", "Bearer garbage");

    expect(response.status).toBe(401);
  });
});

describe("GET /internal/validation-demo/admin-only", () => {
  async function tokenFor(email: string): Promise<string> {
    const response = await request(app)
      .post("/auth/login")
      .send({ email, password: TEST_PASSWORD });
    return response.body.data.token as string;
  }

  it("returns 200 for a valid Admin token", async () => {
    const token = await tokenFor(TEST_USERS[0]!.email);

    const response = await request(app)
      .get("/internal/validation-demo/admin-only")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  it("returns 403 for a valid but non-Admin token", async () => {
    const token = await tokenFor(TEST_USERS[1]!.email);

    const response = await request(app)
      .get("/internal/validation-demo/admin-only")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 401 with no token at all", async () => {
    const response = await request(app).get("/internal/validation-demo/admin-only");

    expect(response.status).toBe(401);
  });
});
