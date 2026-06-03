import { Transform, type TransformCallback } from "node:stream";
import path from "node:path";
import Busboy from "busboy";
import { Router, type Request } from "express";
import type { UploadFileResponse } from "@myclawteam/shared";
import { readUploadConfig } from "../config/env.js";
import { HttpError } from "../http/errors.js";
import {
  createFileMetadataService,
  type FileMetadataService
} from "../services/fileMetadataService.js";
import { createStorageService, type StorageService } from "../storage/storageService.js";

interface ParsedUpload {
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
}

interface FilesRouterOptions {
  storageService?: StorageService;
  fileMetadataService?: FileMetadataService;
}

class FileTooLargeError extends HttpError {
  constructor(maxFileSizeBytes: number) {
    super(413, "file_too_large", `File exceeds the ${maxFileSizeBytes} byte size limit`);
    this.name = "FileTooLargeError";
  }
}

class ByteLimitTransform extends Transform {
  bytesRead = 0;

  constructor(private readonly maxBytes: number) {
    super();
  }

  override _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
    this.bytesRead += chunk.byteLength;

    if (this.bytesRead > this.maxBytes) {
      callback(new FileTooLargeError(this.maxBytes));
      return;
    }

    callback(null, chunk);
  }
}

export function createFilesRouter(options: FilesRouterOptions = {}): Router {
  const router = Router();

  router.post("/", async (req, res, next) => {
    try {
      validateMultipartRequest(req);

      const uploadConfig = readUploadConfig();
      const upload = await parseMultipartUpload(
        req,
        () => options.storageService ?? createStorageService(),
        uploadConfig.maxFileSizeBytes
      );
      const fileMetadataService = options.fileMetadataService ?? createFileMetadataService();
      const file = await fileMetadataService.create({
        originalFilename: upload.originalFilename,
        contentType: upload.contentType,
        sizeBytes: upload.sizeBytes,
        storageKey: upload.storageKey
      });

      const response: UploadFileResponse = {
        file: {
          linkId: file.linkId,
          originalFilename: file.originalFilename,
          contentType: file.contentType,
          sizeBytes: file.sizeBytes,
          createdAt: file.createdAt.toISOString()
        }
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function parseMultipartUpload(
  req: Request,
  storageServiceFactory: () => StorageService,
  maxFileSizeBytes: number
): Promise<ParsedUpload> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: {
        files: 1,
        fields: 0
      }
    });
    let settled = false;
    let sawFile = false;
    let uploadPromise: Promise<ParsedUpload> | undefined;

    const fail = (error: unknown) => {
      if (settled) {
        return;
      }

      settled = true;
      req.unpipe(busboy);
      busboy.removeAllListeners();
      reject(error);
    };

    busboy.on("file", (fieldName, fileStream, info) => {
      if (fieldName !== "file") {
        fileStream.resume();
        fail(new HttpError(400, "invalid_file_field", "Multipart file field must be named file"));
        return;
      }

      if (sawFile) {
        fileStream.resume();
        fail(new HttpError(400, "too_many_files", "Only one file can be uploaded"));
        return;
      }

      sawFile = true;

      const originalFilename = normalizeFilename(info.filename);
      if (!originalFilename) {
        fileStream.resume();
        fail(new HttpError(400, "missing_filename", "Uploaded file must include a filename"));
        return;
      }

      const contentType = normalizeContentType(info.mimeType);
      let storageService: StorageService;

      try {
        storageService = storageServiceFactory();
      } catch (error) {
        fileStream.resume();
        fail(error);
        return;
      }

      const byteLimit = new ByteLimitTransform(maxFileSizeBytes);
      const limitedStream = fileStream.pipe(byteLimit);

      const pendingUpload = storageService
        .putObject({
          body: limitedStream,
          contentType
        })
        .then((result) => ({
          originalFilename,
          contentType,
          sizeBytes: byteLimit.bytesRead,
          storageKey: result.storageKey
        }));

      pendingUpload.catch(fail);
      uploadPromise = pendingUpload;
    });

    busboy.on("field", () => {
      fail(new HttpError(400, "unexpected_field", "Only a file field is accepted"));
    });

    busboy.on("filesLimit", () => {
      fail(new HttpError(400, "too_many_files", "Only one file can be uploaded"));
    });

    busboy.on("fieldsLimit", () => {
      fail(new HttpError(400, "unexpected_field", "Only a file field is accepted"));
    });

    busboy.on("error", fail);

    req.on("aborted", () => {
      fail(new HttpError(400, "request_aborted", "Upload request was aborted"));
    });

    busboy.on("finish", () => {
      if (settled) {
        return;
      }

      if (!sawFile || !uploadPromise) {
        fail(new HttpError(400, "missing_file", "Multipart body must include a file field"));
        return;
      }

      uploadPromise
        .then((upload) => {
          if (!settled) {
            settled = true;
            resolve(upload);
          }
        })
        .catch((error: unknown) => {
          fail(error);
        });
    });

    req.pipe(busboy);
  });
}

function validateMultipartRequest(req: Request): void {
  if (!req.is("multipart/form-data")) {
    throw new HttpError(415, "unsupported_media_type", "Expected multipart/form-data");
  }
}

function normalizeFilename(filename: string | undefined): string | undefined {
  const value = filename?.trim();

  if (!value) {
    return undefined;
  }

  return path.basename(value.replaceAll("\\", "/"));
}

function normalizeContentType(contentType: string | undefined): string {
  return contentType?.trim() || "application/octet-stream";
}
