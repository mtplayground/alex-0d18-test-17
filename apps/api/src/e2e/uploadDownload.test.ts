import { Readable } from "node:stream";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { FileMetadataService } from "../services/fileMetadataService.js";
import type { Response } from "superagent";
import type {
  GetStoredObjectResult,
  PutStoredObjectInput,
  PutStoredObjectResult,
  StorageService
} from "../storage/storageService.js";

const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip;
const linkId = `e2e_${Date.now().toString(36)}`;
const storageKey = `e2e/${linkId}`;
const originalMaxFileSizeBytes = process.env.MAX_FILE_SIZE_BYTES;

describeWithDatabase("upload to link to download", () => {
  const prisma = new PrismaClient();
  const storageService = new InMemoryStorageService(storageKey);
  const appStorageService = storageService as unknown as StorageService;
  const fileMetadataService = new FileMetadataService({
    prisma,
    linkIdFactory: () => linkId
  });

  beforeAll(async () => {
    process.env.MAX_FILE_SIZE_BYTES = "1048576";
    await prisma.file.deleteMany({
      where: {
        linkId
      }
    });
  });

  afterAll(async () => {
    if (originalMaxFileSizeBytes === undefined) {
      delete process.env.MAX_FILE_SIZE_BYTES;
    } else {
      process.env.MAX_FILE_SIZE_BYTES = originalMaxFileSizeBytes;
    }

    await prisma.file.deleteMany({
      where: {
        linkId
      }
    });
    await prisma.$disconnect();
  });

  it("uploads bytes, returns a link ID, and downloads the same bytes", async () => {
    const app = createApp({
      files: {
        fileMetadataService,
        storageService: appStorageService
      },
      download: {
        fileMetadataService,
        storageService: appStorageService
      }
    });
    const expectedBytes = Buffer.from([0x00, 0x01, 0x02, 0x41, 0x7f, 0x80, 0xff]);

    const uploadResponse = await request(app)
      .post("/api/files")
      .attach("file", expectedBytes, {
        filename: "bytes.bin",
        contentType: "application/octet-stream"
      })
      .expect(201);

    expect(uploadResponse.body.file.linkId).toBe(linkId);
    expect(uploadResponse.body.file.sizeBytes).toBe(expectedBytes.length);

    const downloadResponse = await request(app)
      .get(`/${linkId}`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);

    expect(downloadResponse.body).toEqual(expectedBytes);
    expect(downloadResponse.headers["content-type"]).toContain("application/octet-stream");
    expect(downloadResponse.headers["content-length"]).toBe(String(expectedBytes.length));
    expect(downloadResponse.headers["content-disposition"]).toContain('filename="bytes.bin"');
  });
});

class InMemoryStorageService {
  private readonly objects = new Map<
    string,
    {
      body: Buffer;
      contentType: string;
    }
  >();

  constructor(private readonly nextStorageKey: string) {}

  async putObject(input: PutStoredObjectInput): Promise<PutStoredObjectResult> {
    const body = await streamToBuffer(input.body as Readable);
    const contentType = input.contentType ?? "application/octet-stream";

    this.objects.set(this.nextStorageKey, {
      body,
      contentType
    });

    return {
      storageKey: this.nextStorageKey
    };
  }

  async getObject(storageKey: string): Promise<GetStoredObjectResult> {
    const object = this.objects.get(storageKey);

    if (!object) {
      throw new Error(`Missing in-memory object for ${storageKey}`);
    }

    return {
      body: Readable.from(object.body),
      contentType: object.contentType,
      contentLength: object.body.byteLength
    };
  }
}

function binaryParser(response: Response, callback: (error: Error | null, body: Buffer) => void) {
  const chunks: Buffer[] = [];

  response.on("data", (chunk: Buffer) => {
    chunks.push(Buffer.from(chunk));
  });
  response.on("end", () => {
    callback(null, Buffer.concat(chunks));
  });
  response.on("error", (error) => {
    callback(error, Buffer.alloc(0));
  });
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}
