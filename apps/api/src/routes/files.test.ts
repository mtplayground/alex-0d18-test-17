import { Readable } from "node:stream";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import type { FileMetadataService } from "../services/fileMetadataService.js";
import type { PutStoredObjectInput, StorageService } from "../storage/storageService.js";

const originalMaxFileSizeBytes = process.env.MAX_FILE_SIZE_BYTES;

describe("POST /api/files", () => {
  beforeEach(() => {
    process.env.MAX_FILE_SIZE_BYTES = "10";
  });

  afterEach(() => {
    if (originalMaxFileSizeBytes === undefined) {
      delete process.env.MAX_FILE_SIZE_BYTES;
    } else {
      process.env.MAX_FILE_SIZE_BYTES = originalMaxFileSizeBytes;
    }
  });

  it("streams an uploaded file to storage and records metadata", async () => {
    const putObject = vi.fn(async (input: PutStoredObjectInput) => {
      await expect(streamToString(input.body as Readable)).resolves.toBe("hello");
      expect(input.contentType).toBe("text/plain");

      return { storageKey: "files/2026/06/object-id" };
    });
    const create = vi.fn(async (input) => ({
      linkId: "abc123",
      originalFilename: input.originalFilename,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      storageKey: input.storageKey,
      createdAt: new Date("2026-06-03T17:00:00Z")
    }));
    const app = createApp({
      files: {
        storageService: { putObject } as unknown as StorageService,
        fileMetadataService: { create } as unknown as FileMetadataService
      }
    });

    const response = await request(app)
      .post("/api/files")
      .attach("file", Buffer.from("hello"), {
        filename: "hello.txt",
        contentType: "text/plain"
      })
      .expect(201);

    expect(response.body).toEqual({
      file: {
        linkId: "abc123",
        originalFilename: "hello.txt",
        contentType: "text/plain",
        sizeBytes: 5,
        createdAt: "2026-06-03T17:00:00.000Z"
      }
    });
    expect(create).toHaveBeenCalledWith({
      originalFilename: "hello.txt",
      contentType: "text/plain",
      sizeBytes: 5,
      storageKey: "files/2026/06/object-id"
    });
  });

  it("returns a size-limit error when the file exceeds MAX_FILE_SIZE_BYTES", async () => {
    process.env.MAX_FILE_SIZE_BYTES = "4";
    const putObject = vi.fn(async (input: PutStoredObjectInput) => {
      await streamToString(input.body as Readable);
      return { storageKey: "files/2026/06/object-id" };
    });
    const create = vi.fn();
    const app = createApp({
      files: {
        storageService: { putObject } as unknown as StorageService,
        fileMetadataService: { create } as unknown as FileMetadataService
      }
    });

    const response = await request(app)
      .post("/api/files")
      .attach("file", Buffer.from("hello"), {
        filename: "hello.txt",
        contentType: "text/plain"
      })
      .expect(413);

    expect(response.body.error.code).toBe("file_too_large");
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects multipart requests without a file field", async () => {
    const app = createApp();

    const response = await request(app).post("/api/files").field("note", "hello").expect(400);

    expect(response.body.error.code).toBe("unexpected_field");
  });

  it("does not expose internal storage error details", async () => {
    const putObject = vi.fn(async () => {
      throw new Error("storage secret: bucket credentials rejected");
    });
    const create = vi.fn();
    const app = createApp({
      files: {
        storageService: { putObject } as unknown as StorageService,
        fileMetadataService: { create } as unknown as FileMetadataService
      }
    });

    const response = await request(app)
      .post("/api/files")
      .attach("file", Buffer.from("hello"), {
        filename: "hello.txt",
        contentType: "text/plain"
      })
      .expect(500);

    expect(response.body).toEqual({
      error: {
        code: "internal_server_error",
        message: "Unexpected server error"
      }
    });
    expect(create).not.toHaveBeenCalled();
  });
});

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}
