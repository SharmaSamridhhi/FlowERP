// Proves the seeding pipeline runs. Real seed data (demo users per role,
// etc.) is added incrementally by the specs that own that data — starting
// with FLO-011 (specs/FLO-011-auth-rbac.md), which seeds one user per role.

import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.$connect();
  console.log("Seed pipeline connected to the database. Nothing to seed yet.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
