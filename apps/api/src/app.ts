import cors from "cors";
import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import type { ApiErrorResponse, HealthResponse } from "@myclawteam/shared";
import { getHttpError } from "./http/errors.js";
import { createDownloadRouter, type DownloadRouterOptions } from "./routes/download.js";
import { createFilesRouter, type FilesRouterOptions } from "./routes/files.js";

export interface AppOptions {
  download?: DownloadRouterOptions;
  files?: FilesRouterOptions;
}

const notFoundHandler: RequestHandler = (req, res) => {
  const body: ApiErrorResponse = {
    error: {
      code: "not_found",
      message: `No route matches ${req.method} ${req.path}`
    }
  };

  res.status(404).json(body);
};

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const httpError = getHttpError(err);
  const statusCode = httpError?.statusCode ?? 500;
  const code = httpError?.code ?? "internal_server_error";
  const message = err instanceof Error ? err.message : "Unexpected server error";
  const body: ApiErrorResponse = {
    error: {
      code,
      message
    }
  };

  res.status(statusCode).json(body);
};

export function createApp(options: AppOptions = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    const body: HealthResponse = {
      status: "ok",
      service: "myClawTeam API"
    };

    res.json(body);
  });

  app.use("/api/files", createFilesRouter(options.files));
  app.use(createDownloadRouter(options.download));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
