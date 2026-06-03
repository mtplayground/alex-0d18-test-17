export type Environment = NodeJS.ProcessEnv;

export interface ServerConfig {
  host: string;
  port: number;
}

export interface DatabaseConfig {
  url: string;
}

export interface ObjectStorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle: boolean;
}

export interface UploadConfig {
  maxFileSizeBytes: number;
}

export interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  objectStorage: ObjectStorageConfig;
  upload: UploadConfig;
}

export function readRequiredEnv(name: string, env: Environment = process.env): string {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }

  return value;
}

export function readOptionalBooleanEnv(
  name: string,
  defaultValue: boolean,
  env: Environment = process.env
): boolean {
  const value = env[name]?.trim().toLowerCase();

  if (!value) {
    return defaultValue;
  }

  if (value === "true" || value === "1") {
    return true;
  }

  if (value === "false" || value === "0") {
    return false;
  }

  throw new Error(`${name} must be true, false, 1, or 0 when provided`);
}

export function readOptionalStringEnv(
  name: string,
  defaultValue: string,
  env: Environment = process.env
): string {
  const value = env[name]?.trim();
  return value || defaultValue;
}

export function readOptionalIntegerEnv(
  name: string,
  defaultValue: number,
  env: Environment = process.env
): number {
  const value = env[name]?.trim();

  if (!value) {
    return defaultValue;
  }

  return parsePositiveInteger(name, value);
}

export function parsePositiveInteger(name: string, value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${name} must be a positive integer`);
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

export function readServerConfig(env: Environment = process.env): ServerConfig {
  const host = readOptionalStringEnv("HOST", "0.0.0.0", env);
  const port = readOptionalIntegerEnv("PORT", 8080, env);

  if (port > 65535) {
    throw new Error("PORT must be less than or equal to 65535");
  }

  return { host, port };
}

export function readDatabaseConfig(env: Environment = process.env): DatabaseConfig {
  return {
    url: readRequiredEnv("DATABASE_URL", env)
  };
}

export function readObjectStorageConfig(env: Environment = process.env): ObjectStorageConfig {
  return {
    endpoint: readRequiredEnv("OBJECT_STORAGE_ENDPOINT", env),
    region: readRequiredEnv("OBJECT_STORAGE_REGION", env),
    accessKeyId: readRequiredEnv("OBJECT_STORAGE_ACCESS_KEY_ID", env),
    secretAccessKey: readRequiredEnv("OBJECT_STORAGE_SECRET_ACCESS_KEY", env),
    bucket: readRequiredEnv("OBJECT_STORAGE_BUCKET", env),
    forcePathStyle: readOptionalBooleanEnv("OBJECT_STORAGE_FORCE_PATH_STYLE", true, env)
  };
}

export function readUploadConfig(env: Environment = process.env): UploadConfig {
  return {
    maxFileSizeBytes: readOptionalIntegerEnv("MAX_FILE_SIZE_BYTES", 10 * 1024 * 1024, env)
  };
}

export function readAppConfig(env: Environment = process.env): AppConfig {
  return {
    server: readServerConfig(env),
    database: readDatabaseConfig(env),
    objectStorage: readObjectStorageConfig(env),
    upload: readUploadConfig(env)
  };
}
