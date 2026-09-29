import dotenv from "dotenv";
import path from "path";

dotenv.config();

export interface ServerEnvConfig {
  port: number;
  nodeEnv: "development" | "production" | "test";
  isProduction: boolean;
  appUrl: string;
  dataDir: string;
  disableHmr: boolean;
}

function parsePort(val: string | undefined, fallback: number): number {
  if (!val) return fallback;
  const parsed = Number.parseInt(val, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const envConfig: ServerEnvConfig = {
  port: parsePort(process.env.PORT, 3000),
  nodeEnv:
    process.env.NODE_ENV === "production"
      ? "production"
      : process.env.NODE_ENV === "test"
      ? "test"
      : "development",
  isProduction: process.env.NODE_ENV === "production",
  appUrl: (process.env.APP_URL || "").trim(),
  dataDir: path.resolve(process.cwd(), process.env.DATA_DIR || ".data"),
  disableHmr: process.env.DISABLE_HMR === "true",
};

/**
 * Guard against accidental exposure of server-only secrets via VITE_ prefix.
 */
export function auditProcessEnvForLeaks(): string[] {
  const warnings: string[] = [];
  const forbiddenViteKeys = [
    "VITE_GEMINI_API_KEY",
    "VITE_GOOGLE_API_KEY",
    "VITE_JWT_SECRET",
    "VITE_SESSION_SECRET",
    "VITE_LINKEDIN_CLIENT_SECRET",
    "VITE_SUPABASE_SERVICE_ROLE_KEY",
    "VITE_FIREBASE_PRIVATE_KEY",
    "VITE_PRIVATE_KEY",
    "VITE_DATABASE_URL",
  ];

  for (const key of forbiddenViteKeys) {
    if (process.env[key]) {
      warnings.push(
        `CRITICAL SECURITY WARNING: Server-only secret detected in "${key}". Variables prefixed with VITE_ can be bundled into browser code. Remove "${key}" immediately and use the non-VITE_ server variable instead.`
      );
    }
  }

  return warnings;
}
