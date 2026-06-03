export type Environment = NodeJS.ProcessEnv;

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
