import { randomBytes } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { getPrismaClient } from "../db/prisma.js";

const MAX_LINK_ID_ATTEMPTS = 5;

export interface CreateFileMetadataInput {
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
}

export interface FileMetadata {
  linkId: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: Date;
}

export interface FileMetadataServiceOptions {
  prisma?: PrismaClient;
  linkIdFactory?: () => string;
}

export class FileMetadataService {
  private readonly prisma: PrismaClient;
  private readonly linkIdFactory: () => string;

  constructor(options: FileMetadataServiceOptions = {}) {
    this.prisma = options.prisma ?? getPrismaClient();
    this.linkIdFactory = options.linkIdFactory ?? generateLinkId;
  }

  async create(input: CreateFileMetadataInput): Promise<FileMetadata> {
    validateFileMetadataInput(input);

    for (let attempt = 1; attempt <= MAX_LINK_ID_ATTEMPTS; attempt += 1) {
      const linkId = this.linkIdFactory();

      try {
        const file = await this.prisma.file.create({
          data: {
            linkId,
            originalFilename: input.originalFilename,
            contentType: input.contentType,
            sizeBytes: BigInt(input.sizeBytes),
            storageKey: input.storageKey
          }
        });

        return {
          linkId: file.linkId,
          originalFilename: file.originalFilename,
          contentType: file.contentType,
          sizeBytes: Number(file.sizeBytes),
          storageKey: file.storageKey,
          createdAt: file.createdAt
        };
      } catch (error) {
        if (attempt < MAX_LINK_ID_ATTEMPTS && isUniqueLinkIdError(error)) {
          continue;
        }

        throw error;
      }
    }

    throw new Error("Unable to allocate a unique link ID");
  }

  async findByLinkId(linkId: string): Promise<FileMetadata | undefined> {
    if (!linkId.trim()) {
      return undefined;
    }

    const file = await this.prisma.file.findUnique({
      where: {
        linkId
      }
    });

    if (!file) {
      return undefined;
    }

    return {
      linkId: file.linkId,
      originalFilename: file.originalFilename,
      contentType: file.contentType,
      sizeBytes: Number(file.sizeBytes),
      storageKey: file.storageKey,
      createdAt: file.createdAt
    };
  }
}

export function createFileMetadataService(
  options: FileMetadataServiceOptions = {}
): FileMetadataService {
  return new FileMetadataService(options);
}

export function generateLinkId(): string {
  return randomBytes(9).toString("base64url");
}

function validateFileMetadataInput(input: CreateFileMetadataInput): void {
  if (!input.originalFilename.trim()) {
    throw new Error("originalFilename is required");
  }

  if (!input.contentType.trim()) {
    throw new Error("contentType is required");
  }

  if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes < 0) {
    throw new Error("sizeBytes must be a non-negative safe integer");
  }

  if (!input.storageKey.trim()) {
    throw new Error("storageKey is required");
  }
}

function isUniqueLinkIdError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;

  if (Array.isArray(target)) {
    return target.includes("link_id") || target.includes("linkId");
  }

  return target === "link_id" || target === "linkId";
}
