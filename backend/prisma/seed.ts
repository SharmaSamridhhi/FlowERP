// Seeds one demo user per role. Credentials are deliberately safe to
// publish (per FLO-021's "test login credentials for all roles"
// submission requirement) — never reuse SEED_USER_PASSWORD's default as
// anything resembling a real production secret.

import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/services/user.service.js";

const DEFAULT_SEED_PASSWORD = "FlowERP123!";
const SEED_PASSWORD = process.env.SEED_USER_PASSWORD ?? DEFAULT_SEED_PASSWORD;

const DEMO_USERS = [
  { name: "Admin User", email: "admin@flowerp.test", role: "ADMIN" as const },
  { name: "Sales User", email: "sales@flowerp.test", role: "SALES" as const },
  { name: "Warehouse User", email: "warehouse@flowerp.test", role: "WAREHOUSE" as const },
  { name: "Accounts User", email: "accounts@flowerp.test", role: "ACCOUNTS" as const },
];

async function main(): Promise<void> {
  await prisma.$connect();

  const passwordHash = await hashPassword(SEED_PASSWORD);

  for (const demoUser of DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: demoUser.email },
      update: { name: demoUser.name, role: demoUser.role, passwordHash },
      create: { ...demoUser, passwordHash },
    });
  }

  console.log(`Seeded ${DEMO_USERS.length} demo users:`);
  for (const demoUser of DEMO_USERS) {
    console.log(`  ${demoUser.role.padEnd(10)} ${demoUser.email}`);
  }
  console.log(`Password (all accounts): ${SEED_PASSWORD}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
