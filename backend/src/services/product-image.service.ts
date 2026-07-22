// Product image upload (FLO-024). Presigned-URL flow: the browser PUTs
// the file directly to S3 using the short-lived URL this service issues,
// then confirms the object landed before we persist a URL that could
// otherwise 404. Binary bytes never pass through this server. See
// specs/FLO-024-product-image-s3.md's Implementation Notes.
import { randomUUID } from "node:crypto";
import type { S3Client } from "@aws-sdk/client-s3";
import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  ConfirmProductImageInput,
  Product,
  ProductImageUploadUrl,
  RequestProductImageUploadInput,
} from "@flowerp/shared";
import { env } from "../config/env.js";
import { isS3Configured, s3Client } from "../lib/s3-client.js";
import { prisma } from "../lib/prisma.js";
import { NotFoundError, ServiceUnavailableError, ValidationError } from "../utils/errors.js";
import { toProductResponse } from "./product.service.js";

// Short TTL — this URL only needs to live long enough for the browser to
// start the upload it was requested for, not for later reuse. Least
// exposure if it ever leaked (e.g. logged, or into browser history).
const UPLOAD_URL_TTL_SECONDS = 60;

const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function ensureConfigured(): S3Client {
  if (!isS3Configured || !s3Client) {
    throw new ServiceUnavailableError(
      "Product image upload is not configured on this server (missing AWS credentials).",
    );
  }
  return s3Client;
}

function publicUrlFor(objectKey: string): string {
  return `https://${env.awsBucketName}.s3.${env.awsRegion}.amazonaws.com/${objectKey}`;
}

function objectKeyFromUrl(url: string): string | null {
  const marker = ".amazonaws.com/";
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index + marker.length);
}

export async function requestImageUploadUrl(
  productId: string,
  data: RequestProductImageUploadInput,
): Promise<ProductImageUploadUrl> {
  const client = ensureConfigured();

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  const extension = CONTENT_TYPE_EXTENSIONS[data.contentType];
  const objectKey = `products/${productId}/${randomUUID()}.${extension}`;

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: env.awsBucketName,
      Key: objectKey,
      ContentType: data.contentType,
      // Signing the exact byte length turns the client's declared size
      // into a server-enforced condition — S3 rejects the PUT outright
      // if the actual upload doesn't match, not just a polite client check.
      ContentLength: data.fileSizeBytes,
    }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS },
  );

  return { uploadUrl, objectKey, expiresInSeconds: UPLOAD_URL_TTL_SECONDS };
}

export async function confirmImageUpload(
  productId: string,
  data: ConfirmProductImageInput,
): Promise<Product> {
  const client = ensureConfigured();

  const expectedPrefix = `products/${productId}/`;
  if (!data.objectKey.startsWith(expectedPrefix)) {
    throw new ValidationError("Object key does not belong to this product");
  }

  const existing = await prisma.product.findUnique({ where: { id: productId } });
  if (!existing) {
    throw new NotFoundError("Product not found");
  }

  try {
    await client.send(new HeadObjectCommand({ Bucket: env.awsBucketName, Key: data.objectKey }));
  } catch {
    throw new ValidationError(
      "Uploaded image was not found in storage — please try uploading again",
    );
  }

  const newImageUrl = publicUrlFor(data.objectKey);
  const previousImageUrl = existing.imageUrl;

  const updated = await prisma.product.update({
    where: { id: productId },
    data: { imageUrl: newImageUrl },
  });

  // Replacing an image deletes the old object rather than leaving an
  // orphan — a deliberate choice to keep bucket storage (and cost)
  // bounded instead of accumulating an unreferenced object on every
  // re-upload. Best-effort: a failed cleanup never blocks the response.
  if (previousImageUrl && previousImageUrl !== newImageUrl) {
    const previousKey = objectKeyFromUrl(previousImageUrl);
    if (previousKey) {
      await client
        .send(new DeleteObjectCommand({ Bucket: env.awsBucketName, Key: previousKey }))
        .catch(() => undefined);
    }
  }

  return toProductResponse(updated);
}
