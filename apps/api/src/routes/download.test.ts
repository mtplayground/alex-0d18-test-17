import { Readable } from "node:stream";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import type { FileMetadataService } from "../services/fileMetadataService.js";
import type { StorageService } from "../storage/storageService.js";

describe("GET /:linkId", () => {
  it("streams stored objects with metadata headers", async () => {
    const findByLinkId = vi.fn(async () => ({
      linkId: "abc123",
      originalFilename: "hello.txt",
      contentType: "text/plain",
      sizeBytes: 5,
      storageKey: "files/2026/06/object-id",
      createdAt: new Date("2026-06-03T17:00:00Z")
    }));
    const getObject = vi.fn(async () => ({
      body: Readable.from(["hello"]),
      contentType: "application/octet-stream",
      contentLength: 5
    }));
    const app = createApp({
      download: {
        fileMetadataService: { findByLinkId } as unknown as FileMetadataService,
        storageService: { getObject } as unknown as StorageService
      }
    });

    const response = await request(app).get("/abc123").expect(200);

    expect(response.text).toBe("hello");
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.headers["content-length"]).toBe("5");
    expect(response.headers["content-disposition"]).toContain('filename="hello.txt"');
    expect(getObject).toHaveBeenCalledWith("files/2026/06/object-id");
  });

  it("returns 404 for unknown link IDs", async () => {
    const findByLinkId = vi.fn(async () => undefined);
    const getObject = vi.fn();
    const app = createApp({
      download: {
        fileMetadataService: { findByLinkId } as unknown as FileMetadataService,
        storageService: { getObject } as unknown as StorageService
      }
    });

    const response = await request(app).get("/missing").expect(404);

    expect(response.body.error.code).toBe("not_found");
    expect(getObject).not.toHaveBeenCalled();
  });

  it("returns 404 for invalid link IDs", async () => {
    const findByLinkId = vi.fn();
    const app = createApp({
      download: {
        fileMetadataService: { findByLinkId } as unknown as FileMetadataService
      }
    });

    const response = await request(app).get("/bad%21").expect(404);

    expect(response.body.error.code).toBe("not_found");
    expect(findByLinkId).not.toHaveBeenCalled();
  });
});
