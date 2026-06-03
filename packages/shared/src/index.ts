export type HealthStatus = "ok";

export interface HealthResponse {
  status: HealthStatus;
  service: "myClawTeam API";
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface UploadedFile {
  linkId: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface UploadFileResponse {
  file: UploadedFile;
}
