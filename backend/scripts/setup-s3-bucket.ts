// One-time S3 bucket setup for product image upload (FLO-024). Not part
// of the app's runtime — a small ops script, run manually once (or
// re-run safely; every step checks current state before changing it).
//
// Configures exactly two things, scoped as narrowly as the feature needs:
//   1. CORS — allows the browser to PUT directly to S3 from our known
//      frontend origins (the presigned-URL upload flow).
//   2. A bucket policy granting public s3:GetObject ONLY under the
//      `products/*` prefix — not the whole bucket — so uploaded product
//      photos are viewable via their plain URL without making anything
//      else in the bucket public. Object ACLs are deliberately left
//      blocked; this uses a bucket policy instead (the AWS-recommended
//      approach, since ACLs are legacy and often disabled by default).
//
// Usage: npx tsx scripts/setup-s3-bucket.ts
import "dotenv/config";
import {
  GetBucketCorsCommand,
  GetBucketPolicyCommand,
  GetPublicAccessBlockCommand,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
  PutPublicAccessBlockCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.AWS_BUCKET_NAME;
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

if (!REGION || !BUCKET || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.error(
    "Missing AWS_REGION / AWS_BUCKET_NAME / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY.",
  );
  process.exit(1);
}

const ALLOWED_ORIGINS = [
  "https://flowerp.samridhhi.space",
  "http://localhost:5173",
  "http://localhost:8080",
];

const PUBLIC_READ_SID = "PublicReadProductImages";

const client = new S3Client({
  region: REGION,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
});

async function ensureCors(): Promise<void> {
  let existingRules: unknown[] = [];
  try {
    const current = await client.send(new GetBucketCorsCommand({ Bucket: BUCKET }));
    existingRules = current.CORSRules ?? [];
  } catch (error) {
    const code = (error as { name?: string }).name;
    if (code !== "NoSuchCORSConfiguration") {
      throw error;
    }
  }

  const alreadyConfigured = JSON.stringify(existingRules).includes(ALLOWED_ORIGINS[0]!);
  if (alreadyConfigured) {
    console.log("CORS: already configured for our origins — no change.");
    return;
  }

  await client.send(
    new PutBucketCorsCommand({
      Bucket: BUCKET,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: ALLOWED_ORIGINS,
            AllowedMethods: ["PUT", "GET"],
            AllowedHeaders: ["*"],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    }),
  );
  console.log("CORS: configured for", ALLOWED_ORIGINS.join(", "));
}

async function ensurePublicAccessAllowed(): Promise<void> {
  let block;
  try {
    const current = await client.send(new GetPublicAccessBlockCommand({ Bucket: BUCKET }));
    block = current.PublicAccessBlockConfiguration;
  } catch (error) {
    const code = (error as { name?: string }).name;
    if (code !== "NoSuchPublicAccessBlockConfiguration") {
      throw error;
    }
  }

  const needsChange =
    !block || block.BlockPublicPolicy !== false || block.RestrictPublicBuckets !== false;

  if (!needsChange) {
    console.log("Public Access Block: already permits a scoped bucket policy — no change.");
    return;
  }

  await client.send(
    new PutPublicAccessBlockCommand({
      Bucket: BUCKET,
      PublicAccessBlockConfiguration: {
        // ACLs stay blocked — we grant access via bucket policy, not ACLs.
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false,
      },
    }),
  );
  console.log("Public Access Block: relaxed just enough to allow our scoped bucket policy.");
}

async function ensureBucketPolicy(): Promise<void> {
  let existingPolicy: { Version: string; Statement: unknown[] } | null = null;
  try {
    const current = await client.send(new GetBucketPolicyCommand({ Bucket: BUCKET }));
    existingPolicy = JSON.parse(current.Policy ?? "{}");
  } catch (error) {
    const code = (error as { name?: string }).name;
    if (code !== "NoSuchBucketPolicy") {
      throw error;
    }
  }

  const statements = existingPolicy?.Statement ?? [];
  const alreadyPresent = statements.some(
    (statement) => (statement as { Sid?: string }).Sid === PUBLIC_READ_SID,
  );

  if (alreadyPresent) {
    console.log("Bucket policy: scoped public-read statement already present — no change.");
    return;
  }

  const newPolicy = {
    Version: "2012-10-17",
    Statement: [
      ...statements,
      {
        Sid: PUBLIC_READ_SID,
        Effect: "Allow",
        Principal: "*",
        Action: "s3:GetObject",
        // Only the products/ prefix is public — never the whole bucket.
        Resource: `arn:aws:s3:::${BUCKET}/products/*`,
      },
    ],
  };

  await client.send(
    new PutBucketPolicyCommand({ Bucket: BUCKET, Policy: JSON.stringify(newPolicy) }),
  );
  console.log("Bucket policy: added scoped public-read statement for products/*.");
}

async function main(): Promise<void> {
  console.log(`Setting up bucket "${BUCKET}" in ${REGION}...`);
  await ensureCors();
  await ensurePublicAccessAllowed();
  await ensureBucketPolicy();
  console.log("Done.");
}

main().catch((error: unknown) => {
  console.error("S3 bucket setup failed:", error);
  process.exit(1);
});
