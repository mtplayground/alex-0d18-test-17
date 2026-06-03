import type { ApiErrorResponse, UploadFileResponse } from "@myclawteam/shared";

export class UploadRequestError extends Error {
  readonly status?: number;
  readonly code: string;

  constructor(message: string, code: string, status?: number) {
    super(message);
    this.name = "UploadRequestError";
    this.status = status;
    this.code = code;
  }
}

export function uploadFile(
  file: File,
  onProgress: (progress: number) => void
): Promise<UploadFileResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append("file", file);

    xhr.open("POST", "/api/files");
    xhr.responseType = "json";

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.onload = () => {
      const response = xhr.response as UploadFileResponse | ApiErrorResponse | null;

      if (xhr.status >= 200 && xhr.status < 300 && response && "file" in response) {
        onProgress(100);
        resolve(response);
        return;
      }

      if (response && "error" in response) {
        reject(new UploadRequestError(response.error.message, response.error.code, xhr.status));
        return;
      }

      reject(
        new UploadRequestError(
          "Upload failed with an unexpected response",
          "upload_failed",
          xhr.status
        )
      );
    };

    xhr.onerror = () => {
      reject(new UploadRequestError("Network error while uploading the file", "network_error"));
    };

    xhr.onabort = () => {
      reject(new UploadRequestError("Upload was canceled", "upload_aborted"));
    };

    xhr.send(formData);
  });
}
