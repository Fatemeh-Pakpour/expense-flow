type ApiEnv = {
  databaseUrl: string;
  frontendUrl: string;
  port: number;
};

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parseUrl(name: string): string {
  const value = required(name);

  try {
    new URL(value);
  } catch {
    throw new Error(`Environment variable ${name} must be a valid URL`);
  }

  return value;
}

function parsePort(name: string, defaultValue: number): number {
  const value = process.env[name];

  if (!value) {
    return defaultValue;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Environment variable ${name} must be a valid TCP port`);
  }

  return port;
}

export function loadApiEnv(): ApiEnv {
  return {
    databaseUrl: parseUrl('DATABASE_URL'),
    frontendUrl: parseUrl('FRONTEND_URL'),
    port: parsePort('PORT', 3001),
  };
}
