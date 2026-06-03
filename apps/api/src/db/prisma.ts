import { PrismaClient } from "@prisma/client";
import { readRequiredEnv, type Environment } from "../config/env.js";

const globalForPrisma = globalThis as typeof globalThis & {
  myClawTeamPrisma?: PrismaClient;
};

export function readDatabaseUrl(env: Environment = process.env): string {
  return readRequiredEnv("DATABASE_URL", env);
}

export function createPrismaClient(env: Environment = process.env): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: {
        url: readDatabaseUrl(env)
      }
    }
  });
}

export function getPrismaClient(env: Environment = process.env): PrismaClient {
  if (!globalForPrisma.myClawTeamPrisma) {
    globalForPrisma.myClawTeamPrisma = createPrismaClient(env);
  }

  return globalForPrisma.myClawTeamPrisma;
}

export async function disconnectPrisma(): Promise<void> {
  await globalForPrisma.myClawTeamPrisma?.$disconnect();
  globalForPrisma.myClawTeamPrisma = undefined;
}
