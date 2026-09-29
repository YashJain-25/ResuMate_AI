import crypto from "crypto";
import { envConfig, auditProcessEnvForLeaks } from "./env.js";

/**
 * Centralized server-only secret loader & log/error sanitizer.
 * IMPORTANT: This module must ONLY be imported by backend server code (`server.ts`, `server/*`).
 * Never import this file from `src/*` frontend modules.
 */

// Ephemeral per-process fallback secret for local development only
const EPHEMERAL_DEV_SECRET = crypto.randomBytes(32).toString("hex");

function isPlaceholderValue(val: string): boolean {
  if (!val) return true;
  const lower = val.toLowerCase();
  return (
    lower.startsWith("your_") ||
    lower.endsWith("_here") ||
    lower === "changeme" ||
    lower === "placeholder"
  );
}

export function getGeminiApiKey(): string {
  const raw = (process.env.GEMINI_API_KEY || "").trim();
  return isPlaceholderValue(raw) ? "" : raw;
}

export function requireGeminiApiKey(): string {
  const key = getGeminiApiKey();
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not configured on the server. Set GEMINI_API_KEY in your .env file or deployment secret manager."
    );
  }
  return key;
}

export function getSessionSecret(): string {
  const raw = (process.env.JWT_SECRET || process.env.SESSION_SECRET || "").trim();
  if (raw && !isPlaceholderValue(raw)) {
    return raw;
  }
  if (envConfig.isProduction) {
    console.warn(
      "[Security Notice] JWT_SECRET / SESSION_SECRET is not explicitly set in production environment; using per-instance ephemeral cryptographic key."
    );
  }
  return EPHEMERAL_DEV_SECRET;
}

export function getLinkedInOAuthSecrets(): {
  clientId: string;
  clientSecret: string;
  redirectUriOverride: string;
  isConfigured: boolean;
} {
  const rawId = (process.env.LINKEDIN_CLIENT_ID || "").trim();
  const rawSecret = (process.env.LINKEDIN_CLIENT_SECRET || "").trim();
  const clientId = isPlaceholderValue(rawId) ? "" : rawId;
  const clientSecret = isPlaceholderValue(rawSecret) ? "" : rawSecret;
  const redirectUriOverride = (process.env.LINKEDIN_REDIRECT_URI || "").trim();
  return {
    clientId,
    clientSecret,
    redirectUriOverride,
    isConfigured: Boolean(clientId && clientSecret),
  };
}

export function getFirebaseAdminCredentials(): {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  isConfigured: boolean;
} {
  const projectId = (process.env.FIREBASE_PROJECT_ID || "").trim();
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || "").trim();
  const rawKey = (process.env.FIREBASE_PRIVATE_KEY || "").trim();
  const privateKey = isPlaceholderValue(rawKey) ? "" : rawKey.replace(/\\n/g, "\n");
  return {
    projectId: isPlaceholderValue(projectId) ? "" : projectId,
    clientEmail: isPlaceholderValue(clientEmail) ? "" : clientEmail,
    privateKey,
    isConfigured: Boolean(projectId && clientEmail && privateKey),
  };
}

export function getDatabaseAndSupabaseSecrets(): {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  databaseUrl: string;
} {
  const supabaseUrl = (process.env.SUPABASE_URL || "").trim();
  const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const databaseUrl = (process.env.DATABASE_URL || "").trim();
  return {
    supabaseUrl: isPlaceholderValue(supabaseUrl) ? "" : supabaseUrl,
    supabaseServiceRoleKey: isPlaceholderValue(supabaseServiceRoleKey) ? "" : supabaseServiceRoleKey,
    databaseUrl: isPlaceholderValue(databaseUrl) ? "" : databaseUrl,
  };
}

/**
 * Redacts any accidental secret, token, key, password, or credential pattern from error/log strings.
 */
export function sanitizeErrorMessage(err: unknown, fallbackMessage = "An unexpected server error occurred."): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
      ? err
      : fallbackMessage;

  if (!raw) return fallbackMessage;

  let sanitized = raw
    // Redact Google / Gemini API keys
    .replace(/AIza[0-9A-Za-z\-_]{30,}/g, "[REDACTED_API_KEY]")
    // Redact Bearer tokens
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [REDACTED_TOKEN]")
    // Redact PEM private keys
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[REDACTED_PRIVATE_KEY]")
    // Redact connection string passwords
    .replace(/(postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/([^:]+):([^@]+)@/gi, "$1://$2:[REDACTED_PASSWORD]@")
    // Redact query/body client_secret or api_key values
    .replace(/(client_secret|api_key|access_token|refresh_token|password)=([^&\s]+)/gi, "$1=[REDACTED]");

  // Also strip literal server secret values if present in environment
  const activeSecrets = [
    getGeminiApiKey(),
    process.env.JWT_SECRET,
    process.env.SESSION_SECRET,
    process.env.LINKEDIN_CLIENT_SECRET,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.DATABASE_URL,
  ].filter((val): val is string => Boolean(val && val.trim().length >= 8 && !isPlaceholderValue(val)));

  for (const secretVal of activeSecrets) {
    if (sanitized.includes(secretVal)) {
      sanitized = sanitized.split(secretVal).join("[REDACTED_SECRET]");
    }
  }

  return sanitized;
}

/**
 * Validates server secrets on startup and logs non-sensitive security posture diagnostics.
 * Never logs actual secret values.
 */
export function validateServerSecretsOnStartup(): void {
  const leakWarnings = auditProcessEnvForLeaks();
  for (const warning of leakWarnings) {
    console.error(warning);
  }

  if (!getGeminiApiKey()) {
    console.warn(
      "[Security & Config] GEMINI_API_KEY is not set. AI extraction will fall back to deterministic rule-based parsers until GEMINI_API_KEY is provided."
    );
  }
}
