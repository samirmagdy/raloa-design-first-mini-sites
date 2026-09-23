import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { loadConfig } from './config';

const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']);
const maxBytes = 50 * 1024 * 1024;

@Injectable()
export class StorageService {
  private client() { const config = loadConfig(); if (!config.R2_ENDPOINT || !config.R2_ACCESS_KEY_ID || !config.R2_SECRET_ACCESS_KEY || !config.R2_BUCKET) throw new ServiceUnavailableException({ code: 'storage_unconfigured', message: 'Media storage is not configured.' }); return { config, client: new S3Client({ region: 'auto', endpoint: config.R2_ENDPOINT, credentials: { accessKeyId: config.R2_ACCESS_KEY_ID, secretAccessKey: config.R2_SECRET_ACCESS_KEY } }) }; }
  validate(mimeType: string, sizeBytes: number) { if (!allowed.has(mimeType)) throw new Error('Unsupported media type.'); if (!Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > maxBytes) throw new Error('Media must be between 1 byte and 50 MB.'); }
  async presign(profileId: string, filename: string, mimeType: string, sizeBytes: number) { this.validate(mimeType, sizeBytes); const { config, client } = this.client(); const objectKey = `profiles/${profileId}/${randomUUID()}/${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`; const command = new PutObjectCommand({ Bucket: config.R2_BUCKET, Key: objectKey, ContentType: mimeType, ContentLength: sizeBytes }); return { objectKey, uploadUrl: await getSignedUrl(client, command, { expiresIn: 600 }), client }; }
  async complete(objectKey: string, expectedSize: number, expectedMime: string) { const { config, client } = this.client(); const head = await client.send(new HeadObjectCommand({ Bucket: config.R2_BUCKET, Key: objectKey })); if (head.ContentLength !== expectedSize || head.ContentType !== expectedMime) throw new Error('Uploaded media metadata does not match the presigned request.'); return { publicUrl: `${config.R2_ENDPOINT}/${config.R2_BUCKET}/${objectKey}` }; }
  async remove(objectKey: string) { const { config, client } = this.client(); await client.send(new DeleteObjectCommand({ Bucket: config.R2_BUCKET, Key: objectKey })); }
}
