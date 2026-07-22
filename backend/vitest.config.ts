import "dotenv/config";
import { defineConfig } from "vitest/config";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL must be set (see backend/.env / backend/TESTING.md) — " +
      "integration tests run against a real, separate database, never the dev database.",
  );
}

export default defineConfig({
  test: {
    environment: "node",
    env: {
      // A fixed, obviously-fake secret so importing config/env.ts never
      // fails during tests — real secrets are never read from here.
      JWT_SECRET: "test-only-jwt-secret-do-not-use-in-production",
      // Overrides DATABASE_URL for the test process only, so tests run
      // against a real, separate database rather than the dev one or a
      // mock — see backend/TESTING.md and specs/FLO-011-auth-rbac.md.
      DATABASE_URL: testDatabaseUrl,
      // Obviously-fake AWS config so product-image.service tests exercise
      // the real code path with the S3 SDK itself mocked (vi.mock) rather
      // than short-circuiting on "not configured" — no real AWS calls are
      // ever made in CI. See specs/FLO-024-product-image-s3.md.
      AWS_REGION: "us-east-1",
      AWS_ACCESS_KEY_ID: "test-access-key-id",
      AWS_SECRET_ACCESS_KEY: "test-secret-access-key",
      AWS_BUCKET_NAME: "flowerp-test-bucket",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["src/generated/**", "src/server.ts"],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
