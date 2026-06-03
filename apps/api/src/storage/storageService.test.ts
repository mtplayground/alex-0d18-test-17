import { Readable } from "node:stream";
import { GetObjectCommand, PutObjectCommand, S3ServiceException } from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";
import type { ObjectStorageClient } from "./objectStorageClient.js";
import {
  generateStorageKey,
  StorageObjectNotFoundError,
  StorageService
} from "./storageService.js";

describe("StorageService", () => {
  it("generates date-partitioned storage keys", () => {
    expect(generateStorageKey(new Date("2026-06-03T17:00:00Z"), "fixed-id")).toBe(
      "files/2026/06/fixed-id"
    );
  });

  it("puts objects into the configured bucket with generated keys", async () => {
    const send = vi.fn(async (command: unknown) => {
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect(getCommandInput(command)).toMatchObject({
        Bucket: "test-bucket",
        Key: "files/2026/06/object-id",
        ContentType: "text/plain",
        ContentLength: 5
      });

      return { ETag: "etag-value" };
    });
    const service = new StorageService({
      client: createClient(send),
      storageKeyFactory: () => "files/2026/06/object-id"
    });

    const result = await service.putObject({
      body: Readable.from(["hello"]),
      contentType: "text/plain",
      contentLength: 5
    });

    expect(result).toEqual({
      storageKey: "files/2026/06/object-id",
      eTag: "etag-value"
    });
    expect(send).toHaveBeenCalledOnce();
  });

  it("gets objects as readable streams", async () => {
    const send = vi.fn(async (command: unknown) => {
      expect(command).toBeInstanceOf(GetObjectCommand);
      expect(getCommandInput(command)).toMatchObject({
        Bucket: "test-bucket",
        Key: "files/2026/06/object-id"
      });

      return {
        Body: Readable.from(["hello"]),
        ContentType: "text/plain",
        ContentLength: 5,
        ETag: "etag-value",
        LastModified: new Date("2026-06-03T17:00:00Z")
      };
    });
    const service = new StorageService({ client: createClient(send) });

    const result = await service.getObject("files/2026/06/object-id");

    await expect(streamToString(result.body)).resolves.toBe("hello");
    expect(result.contentType).toBe("text/plain");
    expect(result.contentLength).toBe(5);
    expect(result.eTag).toBe("etag-value");
  });

  it("maps S3 missing object responses to StorageObjectNotFoundError", async () => {
    const send = vi.fn(async () => {
      throw new S3ServiceException({
        name: "NoSuchKey",
        message: "missing",
        $fault: "client",
        $metadata: {
          httpStatusCode: 404
        }
      });
    });
    const service = new StorageService({ client: createClient(send) });

    await expect(service.getObject("files/2026/06/missing")).rejects.toBeInstanceOf(
      StorageObjectNotFoundError
    );
  });
});

function createClient(send: (command: unknown) => Promise<unknown>): ObjectStorageClient {
  return {
    bucket: "test-bucket",
    s3: {
      send
    }
  } as unknown as ObjectStorageClient;
}

function getCommandInput(command: unknown): Record<string, unknown> {
  return (command as { input: Record<string, unknown> }).input;
}

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}
