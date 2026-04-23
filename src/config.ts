import { config as dotenvConfig } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

dotenvConfig({ path: resolve(process.cwd(), ".env") });

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Config {
  telegramBotToken: string;
  opencodeServeUrl: string;
  opencodeServeAutoStart: boolean;
  opencodeWorkingDir: string;
  gatewayLogLevel: string;
  databasePath: string;
}

function getEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

function getEnvBool(key: string, fallback: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

export const config: Config = {
  telegramBotToken: getEnv("TELEGRAM_BOT_TOKEN", ""),
  opencodeServeUrl: getEnv("OPENCODE_SERVE_URL", "http://localhost:4096"),
  opencodeServeAutoStart: getEnvBool("OPENCODE_SERVE_AUTO_START", true),
  opencodeWorkingDir: getEnv("OPENCODE_WORKING_DIR", process.cwd()),
  gatewayLogLevel: getEnv("GATEWAY_LOG_LEVEL", "info"),
  databasePath: getEnv("DATABASE_PATH", "./data/gateway.db"),
};

export function ensureDataDir(): void {
  const dbDir = dirname(resolve(config.databasePath));
  mkdirSync(dbDir, { recursive: true });
}
