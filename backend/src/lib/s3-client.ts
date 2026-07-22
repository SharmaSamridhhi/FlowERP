// Product image upload (FLO-024). The client is only constructed when all
// four AWS variables are present — `isS3Configured` is the single check
// every caller uses to fail fast with a clear 503 instead of a confusing
// AWS SDK error deep in a request handler.
import { S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";

export const isS3Configured = Boolean(
  env.awsRegion && env.awsAccessKeyId && env.awsSecretAccessKey && env.awsBucketName,
);

export const s3Client: S3Client | null = isS3Configured
  ? new S3Client({
      region: env.awsRegion!,
      credentials: {
        accessKeyId: env.awsAccessKeyId!,
        secretAccessKey: env.awsSecretAccessKey!,
      },
    })
  : null;
