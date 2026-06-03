import { S3Client, type S3ClientConfig } from "@aws-sdk/client-s3";
import { readOptionalBooleanEnv, readRequiredEnv, type Environment } from "../config/env.js";

export interface ObjectStorageConfig {
  bucket: string;
  clientConfig: S3ClientConfig;
}

export interface ObjectStorageClient {
  bucket: string;
  s3: S3Client;
}

export function readObjectStorageConfig(env: Environment = process.env): ObjectStorageConfig {
  const endpoint = readRequiredEnv("OBJECT_STORAGE_ENDPOINT", env);
  const region = readRequiredEnv("OBJECT_STORAGE_REGION", env);
  const accessKeyId = readRequiredEnv("OBJECT_STORAGE_ACCESS_KEY_ID", env);
  const secretAccessKey = readRequiredEnv("OBJECT_STORAGE_SECRET_ACCESS_KEY", env);
  const bucket = readRequiredEnv("OBJECT_STORAGE_BUCKET", env);
  const forcePathStyle = readOptionalBooleanEnv("OBJECT_STORAGE_FORCE_PATH_STYLE", true, env);

  return {
    bucket,
    clientConfig: {
      endpoint,
      region,
      forcePathStyle,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    }
  };
}

export function createObjectStorageClient(
  config: ObjectStorageConfig = readObjectStorageConfig()
): ObjectStorageClient {
  return {
    bucket: config.bucket,
    s3: new S3Client(config.clientConfig)
  };
}
