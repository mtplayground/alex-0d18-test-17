import { Router } from "express";
import { HttpError } from "../http/errors.js";
import {
  createFileMetadataService,
  type FileMetadata,
  type FileMetadataService
} from "../services/fileMetadataService.js";
import {
  createStorageService,
  StorageObjectNotFoundError,
  type StorageService
} from "../storage/storageService.js";

interface DownloadRouterOptions {
  fileMetadataService?: FileMetadataService;
  storageService?: StorageService;
}

export function createDownloadRouter(options: DownloadRouterOptions = {}): Router {
  const router = Router();

  router.get("/:linkId", async (req, res, next) => {
    try {
      const linkId = req.params.linkId;

      if (!isValidLinkId(linkId)) {
        throw notFound();
      }

      const fileMetadataService = options.fileMetadataService ?? createFileMetadataService();
      const file = await fileMetadataService.findByLinkId(linkId);

      if (!file) {
        throw notFound();
      }

      const storageService = options.storageService ?? createStorageService();
      const storedObject = await storageService.getObject(file.storageKey);

      res.status(200);
      res.setHeader("Content-Type", file.contentType);
      res.setHeader("Content-Length", String(file.sizeBytes));
      res.setHeader("Content-Disposition", createContentDisposition(file));

      storedObject.body.on("error", (error) => {
        if (res.headersSent) {
          res.destroy(error);
          return;
        }

        next(error);
      });

      storedObject.body.pipe(res);
    } catch (error) {
      if (error instanceof StorageObjectNotFoundError) {
        next(notFound());
        return;
      }

      next(error);
    }
  });

  return router;
}

function notFound(): HttpError {
  return new HttpError(404, "not_found", "No file found for that link ID");
}

function isValidLinkId(linkId: string | undefined): linkId is string {
  return Boolean(linkId && /^[A-Za-z0-9_-]{1,32}$/.test(linkId));
}

function createContentDisposition(file: FileMetadata): string {
  const fallbackFilename = createAsciiFilename(file.originalFilename);
  const encodedFilename = encodeRFC5987Value(file.originalFilename);

  return `attachment; filename="${fallbackFilename}"; filename*=UTF-8''${encodedFilename}`;
}

function createAsciiFilename(filename: string): string {
  const fallback = filename
    .replace(/[\r\n]/g, " ")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_")
    .trim();

  return fallback || "download";
}

function encodeRFC5987Value(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}
