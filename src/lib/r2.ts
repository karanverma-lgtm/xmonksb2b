import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const accountId =
  process.env.R2_ACCOUNT_ID || "c608149ffe8bf5bb6d2ffe4e5afeedb7";
const accessKeyId =
  process.env.R2_ACCESS_KEY_ID || "0de0cef289169f68315924d27140e87d";
const secretAccessKey =
  process.env.R2_SECRET_ACCESS_KEY ||
  "b05b0aa3969b389f224fdc32f1fa68373a52ee3948c9e7bc4cd297a961eee66a";

export const R2_BUCKET = process.env.R2_BUCKET_VIDEOS || "cmmvideos";
export const R2_FOLDER = "b2bxmonks";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

/**
 * Upload file buffer to Cloudflare R2 under b2bxmonks folder
 */
export async function uploadFileToR2(
  key: string,
  body: Uint8Array | Buffer,
  contentType: string = "application/pdf"
) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  return await r2Client.send(command);
}

/**
 * Retrieve file from Cloudflare R2
 */
export async function getFileFromR2(key: string) {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });

  return await r2Client.send(command);
}

/**
 * Delete file from Cloudflare R2
 */
export async function deleteFileFromR2(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });

  return await r2Client.send(command);
}
