import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// The S3 SDK itself is mocked — these tests never make a real AWS call
// (see specs/FLO-024-product-image-s3.md's acceptance criteria). Real
// Prisma against the test database, same convention as
// stock-movement.service.test.ts.
const mockSend = vi.fn();

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

const { prisma } = await import("../lib/prisma.js");
const { NotFoundError, ValidationError } = await import("../utils/errors.js");
const productImageService = await import("./product-image.service.js");

let testProductId: string;

beforeEach(async () => {
  mockSend.mockReset();
  mockSend.mockResolvedValue({});

  const product = await prisma.product.create({
    data: {
      name: "ZZZ-Test Image Widget",
      sku: `ZZZ-TEST-IMGSVC-${Date.now()}-${Math.random()}`,
      category: "Hardware",
      unitPrice: 10,
      currentStock: 5,
      minStockAlertQuantity: 0,
    },
  });
  testProductId = product.id;
});

afterAll(async () => {
  await prisma.product.deleteMany({ where: { sku: { startsWith: "ZZZ-TEST-IMGSVC-" } } });
  await prisma.$disconnect();
});

describe("requestImageUploadUrl", () => {
  it("returns a presigned URL and a product-scoped, extension-correct object key", async () => {
    const result = await productImageService.requestImageUploadUrl(testProductId, {
      contentType: "image/png",
      fileSizeBytes: 1024,
    });

    expect(result.uploadUrl).toContain("https://");
    expect(result.objectKey.startsWith(`products/${testProductId}/`)).toBe(true);
    expect(result.objectKey.endsWith(".png")).toBe(true);
    expect(result.expiresInSeconds).toBeGreaterThan(0);
  });

  it("throws NotFoundError for a non-existent product", async () => {
    await expect(
      productImageService.requestImageUploadUrl("does-not-exist", {
        contentType: "image/png",
        fileSizeBytes: 1024,
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("confirmImageUpload", () => {
  it("persists the object's public URL onto the product after confirming it exists in S3", async () => {
    const objectKey = `products/${testProductId}/${randomUUID()}.png`;
    const product = await productImageService.confirmImageUpload(testProductId, { objectKey });

    expect(product.imageUrl).toBe(
      `https://flowerp-test-bucket.s3.us-east-1.amazonaws.com/${objectKey}`,
    );
  });

  it("rejects an object key that doesn't belong to this product", async () => {
    await expect(
      productImageService.confirmImageUpload(testProductId, {
        objectKey: `products/some-other-product/${randomUUID()}.png`,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("rejects when the uploaded object can't be found in S3 (HeadObject fails)", async () => {
    mockSend.mockRejectedValueOnce(new Error("NotFound"));

    await expect(
      productImageService.confirmImageUpload(testProductId, {
        objectKey: `products/${testProductId}/${randomUUID()}.png`,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("deletes the previous object when replacing an existing image", async () => {
    const firstKey = `products/${testProductId}/${randomUUID()}.png`;
    await productImageService.confirmImageUpload(testProductId, { objectKey: firstKey });

    mockSend.mockClear();
    const secondKey = `products/${testProductId}/${randomUUID()}.png`;
    await productImageService.confirmImageUpload(testProductId, { objectKey: secondKey });

    // HeadObject for the new key, then DeleteObject for the old one.
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it("throws NotFoundError for a non-existent product", async () => {
    await expect(
      productImageService.confirmImageUpload("does-not-exist", {
        objectKey: `products/does-not-exist/${randomUUID()}.png`,
      }),
    ).rejects.toThrow(NotFoundError);
  });
});
