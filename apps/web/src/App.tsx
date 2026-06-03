import { useRef, useState, type DragEvent } from "react";
import { AlertCircle, CheckCircle2, FileUp, RotateCcw, Upload, X } from "lucide-react";
import type { UploadFileResponse } from "@myclawteam/shared";
import { uploadFile, UploadRequestError } from "./api/files";

const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

type UploadPhase = "idle" | "ready" | "uploading" | "success" | "error";

interface UploadState {
  phase: UploadPhase;
  file?: File;
  progress: number;
  error?: string;
  response?: UploadFileResponse;
}

const initialUploadState: UploadState = {
  phase: "idle",
  progress: 0
};

export function App() {
  const [uploadState, setUploadState] = useState<UploadState>(initialUploadState);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxFileSizeBytes = readMaxFileSizeBytes();

  const selectedFile = uploadState.file;
  const canUpload = uploadState.phase === "ready" && selectedFile;
  const isUploading = uploadState.phase === "uploading";

  const selectFiles = (files: FileList | null) => {
    const nextFile = validateFileSelection(files, maxFileSizeBytes);

    if (nextFile instanceof Error) {
      setUploadState({
        phase: "error",
        progress: 0,
        error: nextFile.message
      });
      return;
    }

    setUploadState({
      phase: "ready",
      file: nextFile,
      progress: 0
    });
  };

  const startUpload = async () => {
    if (!selectedFile || isUploading) {
      return;
    }

    setUploadState({
      phase: "uploading",
      file: selectedFile,
      progress: 0
    });

    try {
      const response = await uploadFile(selectedFile, (progress) => {
        setUploadState((current) => ({
          ...current,
          progress
        }));
      });

      setUploadState({
        phase: "success",
        file: selectedFile,
        progress: 100,
        response
      });
    } catch (error) {
      setUploadState({
        phase: "error",
        file: selectedFile,
        progress: 0,
        error: formatUploadError(error, maxFileSizeBytes)
      });
    }
  };

  const resetUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setUploadState(initialUploadState);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);

    if (!isUploading) {
      selectFiles(event.dataTransfer.files);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-5 py-8 sm:px-8">
        <div className="mb-8 flex flex-col gap-3 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
              File sharing workspace
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-normal sm:text-5xl">myClawTeam</h1>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-600">
            Upload one file up to {formatBytes(maxFileSizeBytes)} and receive a short link ID.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <label
            className={[
              "flex min-h-[360px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-white px-6 py-10 text-center shadow-sm transition",
              isDragging ? "border-teal-500 bg-teal-50" : "border-slate-300 hover:border-teal-500",
              isUploading ? "cursor-not-allowed opacity-75" : ""
            ].join(" ")}
            onDragEnter={(event) => {
              event.preventDefault();
              if (!isUploading) {
                setIsDragging(true);
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              disabled={isUploading}
              onChange={(event) => selectFiles(event.target.files)}
            />
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-teal-700">
              <FileUp aria-hidden="true" size={30} />
            </span>
            <span className="mt-6 text-xl font-semibold text-slate-950">
              Drop a file here or choose from your device
            </span>
            <span className="mt-3 text-sm text-slate-600">
              One file only, maximum {formatBytes(maxFileSizeBytes)}
            </span>
          </label>

          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Upload status</h2>
                <p className="mt-1 text-sm text-slate-600">{statusCopy(uploadState.phase)}</p>
              </div>
              {uploadState.phase !== "idle" ? (
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={resetUpload}
                  disabled={isUploading}
                  title="Clear upload"
                >
                  <X aria-hidden="true" size={18} />
                </button>
              ) : null}
            </div>

            {selectedFile ? (
              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="break-words text-sm font-medium text-slate-950">
                  {selectedFile.name}
                </p>
                <p className="mt-1 text-sm text-slate-600">{formatBytes(selectedFile.size)}</p>
              </div>
            ) : null}

            {uploadState.phase === "uploading" || uploadState.phase === "success" ? (
              <div className="mt-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">Progress</span>
                  <span className="tabular-nums text-slate-600">{uploadState.progress}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-teal-600 transition-[width]"
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
              </div>
            ) : null}

            {uploadState.phase === "error" && uploadState.error ? (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <div className="flex gap-2">
                  <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
                  <p>{uploadState.error}</p>
                </div>
              </div>
            ) : null}

            {uploadState.phase === "success" && uploadState.response ? (
              <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <div className="flex gap-2">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
                  <div>
                    <p className="font-medium">Upload complete</p>
                    <p className="mt-1 break-all">Link ID: {uploadState.response.file.linkId}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                onClick={startUpload}
                disabled={!canUpload}
              >
                <Upload aria-hidden="true" size={17} />
                Upload
              </button>
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={resetUpload}
                disabled={uploadState.phase === "idle" || isUploading}
              >
                <RotateCcw aria-hidden="true" size={17} />
                Reset
              </button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function readMaxFileSizeBytes(): number {
  const configuredValue = Number.parseInt(import.meta.env.VITE_MAX_FILE_SIZE_BYTES ?? "", 10);

  if (Number.isSafeInteger(configuredValue) && configuredValue > 0) {
    return configuredValue;
  }

  return DEFAULT_MAX_FILE_SIZE_BYTES;
}

function validateFileSelection(files: FileList | null, maxFileSizeBytes: number): File | Error {
  if (!files || files.length === 0) {
    return new Error("Choose a file to upload.");
  }

  if (files.length > 1) {
    return new Error("Choose one file at a time.");
  }

  const file = files.item(0);

  if (!file) {
    return new Error("Choose a file to upload.");
  }

  if (file.size > maxFileSizeBytes) {
    return new Error(`File is too large. Maximum size is ${formatBytes(maxFileSizeBytes)}.`);
  }

  return file;
}

function formatUploadError(error: unknown, maxFileSizeBytes: number): string {
  if (error instanceof UploadRequestError) {
    if (error.code === "file_too_large" || error.status === 413) {
      return `File is too large. Maximum size is ${formatBytes(maxFileSizeBytes)}.`;
    }

    if (error.code === "network_error") {
      return "Network error while uploading. Check your connection and try again.";
    }

    return error.message;
  }

  return "Upload failed. Try again.";
}

function statusCopy(phase: UploadPhase): string {
  switch (phase) {
    case "ready":
      return "Ready to upload.";
    case "uploading":
      return "Uploading file.";
    case "success":
      return "File uploaded.";
    case "error":
      return "Action needed.";
    case "idle":
      return "No file selected.";
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}
