import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3ServiceException,
  type GetObjectCommandOutput,
  type PutObjectCommandInput
} from "@aws-sdk/client-s3";
import { createObjectStorageClient, type ObjectStorageClient } from "./objectStorageClient.js";

export type PutObjectBody = NonNullable<PutObjectCommandInput["Body"]>;
export type StorageKeyFactory = () => string;

export interface PutStoredObjectInput {
  body: PutObjectBody;
  contentType?: string;
  contentLength?: number;
}

export interface PutStoredObjectResult {
  storageKey: string;
  eTag?: string;
}

export interface GetStoredObjectResult {
  body: Readable;
  contentType: string;
  contentLength?: number;
  eTag?: string;
  lastModified?: Date;
}

export interface StorageServiceOptions {
  client?: ObjectStorageClient;
  storageKeyFactory?: StorageKeyFactory;
}

export class StorageObjectNotFoundError extends Error {
  constructor(storageKey: string, options?: ErrorOptions) {
    super(`Object not found for storage key "${storageKey}"`, options);
    this.name = "StorageObjectNotFoundError";
  }
}

export class StorageServiceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "StorageServiceError";
  }
}

export function generateStorageKey(now: Date = new Date(), id: string = randomUUID()): string {
  if (Number.isNaN(now.getTime())) {
    throw new StorageServiceError("Cannot generate storage key from an invalid date");
  }

  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  return `files/${year}/${month}/${id}`;
}

export class StorageService {
  private readonly client: ObjectStorageClient;
  private readonly storageKeyFactory: StorageKeyFactory;

  constructor(options: StorageServiceOptions = {}) {
    this.client = options.client ?? createObjectStorageClient();
    this.storageKeyFactory = options.storageKeyFactory ?? generateStorageKey;
  }

  async putObject(input: PutStoredObjectInput): Promise<PutStoredObjectResult> {
    const storageKey = this.storageKeyFactory();
    validateStorageKey(storageKey);
    validateContentLength(input.contentLength);

    const result = await this.client.s3.send(
      new PutObjectCommand({
        Bucket: this.client.bucket,
        Key: storageKey,
        Body: input.body,
        ContentType: normalizeContentType(input.contentType),
        ContentLength: input.contentLength
      })
    );

    return {
      storageKey,
      eTag: result.ETag
    };
  }

  async getObject(storageKey: string): Promise<GetStoredObjectResult> {
    validateStorageKey(storageKey);

    try {
      const result = await this.client.s3.send(
        new GetObjectCommand({
          Bucket: this.client.bucket,
          Key: storageKey
        })
      );

      return toStoredObjectResult(storageKey, result);
    } catch (error) {
      if (isObjectNotFoundError(error)) {
        throw new StorageObjectNotFoundError(storageKey, { cause: error });
      }

      throw error;
    }
  }
}

export function createStorageService(options: StorageServiceOptions = {}): StorageService {
  return new StorageService(options);
}

function normalizeContentType(contentType: string | undefined): string {
  return contentType?.trim() || "application/octet-stream";
}

function validateContentLength(contentLength: number | undefined): void {
  if (contentLength === undefined) {
    return;
  }

  if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
    throw new StorageServiceError("contentLength must be a non-negative safe integer");
  }
}

function validateStorageKey(storageKey: string): void {
  if (!storageKey.trim()) {
    throw new StorageServiceError("storageKey must be a non-empty string");
  }

  if (storageKey.startsWith("/")) {
    throw new StorageServiceError("storageKey must be relative");
  }
}

function isObjectNotFoundError(error: unknown): boolean {
  if (!(error instanceof S3ServiceException)) {
    return false;
  }

  return error.name === "NoSuchKey" || error.$metadata.httpStatusCode === 404;
}

function toStoredObjectResult(
  storageKey: string,
  result: GetObjectCommandOutput
): GetStoredObjectResult {
  return {
    body: toReadableBody(storageKey, result.Body),
    contentType: normalizeContentType(result.ContentType),
    contentLength: result.ContentLength,
    eTag: result.ETag,
    lastModified: result.LastModified
  };
}

function toReadableBody(storageKey: string, body: GetObjectCommandOutput["Body"]): Readable {
  if (!body) {
    throw new StorageServiceError(`Storage returned no body for "${storageKey}"`);
  }

  if (body instanceof Readable) {
    return body;
  }

  if (isAsyncIterable(body)) {
    return Readable.from(body);
  }

  const webStream = body.transformToWebStream() as NodeReadableStream<Uint8Array>;
  return Readable.fromWeb(webStream);
}

function isAsyncIterable(value: unknown): value is AsyncIterable<Uint8Array> {
  return (
    typeof value === "object" &&
    value !== null &&
    Symbol.asyncIterator in value &&
    typeof value[Symbol.asyncIterator as keyof typeof value] === "function"
  );
}
