/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAX_FILE_SIZE_BYTES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
