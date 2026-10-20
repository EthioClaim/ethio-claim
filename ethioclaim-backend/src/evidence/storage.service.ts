import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private endpointUrl: string;
  private localStorageDir: string;

  constructor() {
    this.endpointUrl = process.env.AWS_ENDPOINT_URL_S3 || '';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
    const region = process.env.AWS_REGION || 'us-east-2';
    this.bucketName = process.env.AWS_BUCKET_NAME || 'ethioclaim-evidence';

    // Local fallback directory
    this.localStorageDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.localStorageDir)) {
      try {
        fs.mkdirSync(this.localStorageDir, { recursive: true });
      } catch (e) {
        this.logger.warn(`Could not create uploads directory: ${e.message}`);
      }
    }

    if (this.endpointUrl && accessKeyId && secretAccessKey) {
      try {
        this.s3Client = new S3Client({
          endpoint: this.endpointUrl,
          region,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
          forcePathStyle: true,
        });
        this.logger.log(`Initialized S3 storage client for endpoint: ${this.endpointUrl}`);
      } catch (err) {
        this.logger.error(`Failed to initialize S3 client: ${err.message}`);
        this.s3Client = null;
      }
    } else {
      this.logger.warn('S3 credentials not fully configured, will use local storage fallback');
    }
  }

  /**
   * Compute SHA-256 hash of a file buffer
   */
  computeSha256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Upload file to Neon S3-compatible storage with SHA-256 calculation
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    claimId: string,
  ): Promise<{
    storageKey: string;
    publicUrl: string;
    sha256: string;
  }> {
    const sha256 = this.computeSha256(fileBuffer);
    const ext = path.extname(originalName) || '.jpg';
    const storageKey = `claims/${claimId}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

    let publicUrl = `${this.endpointUrl}/${this.bucketName}/${storageKey}`;

    // Try uploading to S3
    if (this.s3Client) {
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: storageKey,
            Body: fileBuffer,
            ContentType: mimeType,
          }),
        );
        this.logger.log(`Uploaded evidence to S3: ${storageKey}`);
      } catch (err) {
        this.logger.warn(`S3 upload error (${err.message}). Using persistent local backup.`);
        // Save locally as reliable fallback
        const localPath = path.join(this.localStorageDir, storageKey.replace(/[\/\\]/g, '_'));
        fs.writeFileSync(localPath, fileBuffer);
        publicUrl = `/api/v1/evidence/file/${encodeURIComponent(storageKey)}`;
      }
    } else {
      // Local storage fallback
      const localPath = path.join(this.localStorageDir, storageKey.replace(/[\/\\]/g, '_'));
      fs.writeFileSync(localPath, fileBuffer);
      publicUrl = `/api/v1/evidence/file/${encodeURIComponent(storageKey)}`;
    }

    return {
      storageKey,
      publicUrl,
      sha256,
    };
  }

  /**
   * Download or stream file bytes
   */
  async getFileStream(storageKey: string): Promise<{
    stream: Readable;
    contentType?: string;
  }> {
    // Check if file exists locally first
    const localPath = path.join(this.localStorageDir, storageKey.replace(/[\/\\]/g, '_'));
    if (fs.existsSync(localPath)) {
      return {
        stream: fs.createReadStream(localPath),
      };
    }

    // Try S3
    if (this.s3Client) {
      try {
        const response = await this.s3Client.send(
          new GetObjectCommand({
            Bucket: this.bucketName,
            Key: storageKey,
          }),
        );
        return {
          stream: response.Body as Readable,
          contentType: response.ContentType,
        };
      } catch (err) {
        this.logger.error(`S3 getObject failed: ${err.message}`);
      }
    }

    // Generate fallback placeholder image if not found
    const fallbackBuffer = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="#1e293b"/><text x="50%" y="50%" fill="#94a3b8" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16">EthioClaim Evidence Image</text></svg>',
    );
    const stream = new Readable();
    stream.push(fallbackBuffer);
    stream.push(null);
    return {
      stream,
      contentType: 'image/svg+xml',
    };
  }
}
