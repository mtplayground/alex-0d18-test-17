import { S3Client, type S3ClientConfig } from "@aws-sdk/client-s3";
import {
  readObjectStorageConfig as readObjectStorageEnvConfig,
  type Environment,
  type ObjectStorageConfig as ObjectStorageEnvConfig
} from "../config/env.js";

export interface S3ObjectStorageConfig {
  bucket: string;
  clientConfig: S3ClientConfig;
}

export interface ObjectStorageClient {
  bucket: string;
  s3: S3Client;
}

export function toS3ObjectStorageConfig(config: ObjectStorageEnvConfig): S3ObjectStorageConfig {
  return {
    bucket: config.bucket,
    clientConfig: {
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    }
  };
}

export function readObjectStorageConfig(env: Environment = process.env): S3ObjectStorageConfig {
  return toS3ObjectStorageConfig(readObjectStorageEnvConfig(env));
}

export function createObjectStorageClient(
  config: S3ObjectStorageConfig = readObjectStorageConfig()
): ObjectStorageClient {
  return {
    bucket: config.bucket,
    s3: new S3Client(config.clientConfig)
  };
}
