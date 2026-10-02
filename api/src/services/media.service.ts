import { v4 as uuid } from 'uuid';
import { logger } from '../lib/logger';

const isMock = () => process.env.MEDIA_MOCK_MODE !== 'false';

export function getPresignedUploadUrl(fileKey: string, contentType: string) {
  if (isMock()) {
    // MOCK: replace with s3.getSignedUrlPromise('putObject', { Bucket: S3_BUCKET, Key: fileKey, ContentType: contentType, Expires: 600 })
    logger.info(`[MEDIA MOCK] presigned upload URL for ${fileKey}`);
    return {
      uploadUrl: `http://localhost:${process.env.PORT ?? 4000}/v1/media/mock-upload/${fileKey}`,
      fileKey,
      deliveryUrl: getDeliveryUrl(fileKey),
    };
  }
  throw new Error('S3 not configured');
}

export function getDeliveryUrl(fileKey: string): string {
  if (isMock()) {
    // MOCK: replace with `${process.env.CLOUDFRONT_URL}/${fileKey}`
    return `http://localhost:${process.env.PORT ?? 4000}/static/${fileKey}`;
  }
  return `${process.env.CLOUDFRONT_URL}/${fileKey}`;
}

export function generateFileKey(folder: string, ext: string): string {
  return `${folder}/${uuid()}.${ext}`;
}

export async function deleteMedia(fileKey: string) {
  if (isMock()) {
    // MOCK: replace with s3.deleteObject({ Bucket: S3_BUCKET, Key: fileKey }).promise()
    logger.info(`[MEDIA MOCK] delete ${fileKey}`);
    return;
  }
  throw new Error('S3 not configured');
}
