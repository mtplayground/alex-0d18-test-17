export class HttpError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function getHttpError(error: unknown): HttpError | undefined {
  return error instanceof HttpError ? error : undefined;
}
