import { createHash, randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { MediaRightsStatus, MediaStatus } from '@ilham/database';
import { DatabaseService } from '../common/database.module';

export interface UploadRequest {
  filename: string;
  contentType: string;
  byteSize: number;
}
/** Minimal multer file shape (no @types/multer dependency). */
export interface UploadedBinary {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
export interface StoragePort {
  createUpload(
    request: UploadRequest,
  ): Promise<{ key: string; uploadUrl: string; expiresIn: number }>;
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

@Injectable()
export class S3StorageService implements StoragePort {
  private readonly bucket = process.env.S3_BUCKET ?? 'ilham-media';
  /** Browser-reachable base URL of the bucket (CDN in production). */
  private readonly publicBase = (
    process.env.MEDIA_PUBLIC_URL ?? `http://localhost:9000/${process.env.S3_BUCKET ?? 'ilham-media'}`
  ).replace(/\/$/, '');
  private readonly client = new S3Client({
    region: process.env.S3_REGION ?? 'us-east-1',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
    ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
    ...(process.env.S3_ACCESS_KEY
      ? {
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY,
            secretAccessKey: process.env.S3_SECRET_KEY ?? '',
          },
        }
      : {}),
  });

  constructor(private readonly db: DatabaseService) {}

  private objectKey(filename: string, contentType: string) {
    const extension =
      EXTENSION_BY_MIME[contentType] ??
      filename
        .split('.')
        .pop()
        ?.replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase() ??
      'bin';
    return `originals/${new Date().getUTCFullYear()}/${randomUUID()}.${extension}`;
  }

  publicUrl(key: string) {
    return `${this.publicBase}/${key}`;
  }

  async createUpload(request: UploadRequest) {
    const key = this.objectKey(request.filename, request.contentType);
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: request.contentType,
      ContentLength: request.byteSize,
      Metadata: { originalname: encodeURIComponent(request.filename) },
    });
    return {
      key,
      uploadUrl: await getSignedUrl(this.client, command, { expiresIn: 300 }),
      expiresIn: 300,
    };
  }

  /** Puts an image the API already holds in memory and records it as a READY asset. */
  async storeImage(file: UploadedBinary, uploaderId: string) {
    const key = this.objectKey(file.originalname, file.mimetype);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentLength: file.size,
        CacheControl: 'public, max-age=31536000, immutable',
        Metadata: { originalname: encodeURIComponent(file.originalname) },
      }),
    );
    const asset = await this.db.mediaAsset.create({
      data: {
        storageKey: key,
        bucket: this.bucket,
        originalName: file.originalname.slice(0, 255),
        mimeType: file.mimetype,
        byteSize: BigInt(file.size),
        checksum: createHash('sha256').update(file.buffer).digest('hex'),
        status: MediaStatus.READY,
        uploaderId,
        // Staff uploads: the editorial team owns/clears the rights before publishing.
        rightsStatus: MediaRightsStatus.SELF_OWNED,
        consentConfirmedAt: new Date(),
      },
      select: { id: true, storageKey: true, mimeType: true },
    });
    return { id: asset.id, key, url: this.publicUrl(key), mimeType: asset.mimeType, size: file.size };
  }
}
