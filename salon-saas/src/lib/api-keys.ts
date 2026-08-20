import { createHash, randomBytes } from "crypto";

export const API_KEY_PREFIX = "lior";
const KEY_BYTES = 24;
const KEY_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function base62(bytes: Buffer): string {
  let result = "";
  let value = BigInt("0x" + bytes.toString("hex"));
  const base = 62n;
  while (value > 0n) {
    result = KEY_ALPHABET[Number(value % base)] + result;
    value /= base;
  }
  return result.padStart(bytes.length * 2, "0").slice(0, 24);
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(environment: "production" | "test" = "production"): {
  key: string;
  prefix: string;
  keyHash: string;
} {
  const raw = base62(randomBytes(KEY_BYTES));
  const key = `${API_KEY_PREFIX}_${environment === "test" ? "test" : "prod"}_${raw}`;
  return {
    key,
    prefix: key.slice(0, 18),
    keyHash: hashApiKey(key),
  };
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

export function maskApiKey(prefix: string): string {
  return `${prefix}...`;
}