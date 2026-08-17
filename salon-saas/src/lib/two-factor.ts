const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const CODE_DIGITS = 6;
const VERIFY_WINDOW = 1;
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 10;

function webCrypto(): Crypto {
  if (typeof globalThis.crypto !== "undefined") return globalThis.crypto;
  throw new Error("Web Crypto API not available");
}

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(input: string): Uint8Array {
  const cleaned = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of cleaned) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

export function generateSecret(byteLength = 20): string {
  const bytes = new Uint8Array(byteLength);
  webCrypto().getRandomValues(bytes);
  return base32Encode(bytes);
}

export async function generateTOTP(secret: string, at: Date = new Date(), digits = CODE_DIGITS): Promise<string> {
  const counter = Math.floor(at.getTime() / 1000 / STEP_SECONDS);
  const counterBuffer = new Uint8Array(8);
  const view = new DataView(counterBuffer.buffer);
  view.setBigUint64(0, BigInt(counter), false);

  const key = base32Decode(secret);
  const cryptoKey = await webCrypto().subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await webCrypto().subtle.sign("HMAC", cryptoKey, counterBuffer as BufferSource);
  const hmac = new Uint8Array(signature);

  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (binary % 10 ** digits).toString().padStart(digits, "0");
}

export async function verifyTOTP(secret: string, token: string, window = VERIFY_WINDOW): Promise<boolean> {
  if (!/^\d{6}$/.test(token.trim())) return false;
  const now = new Date();
  for (let offset = -window; offset <= window; offset++) {
    const at = new Date(now.getTime() + offset * STEP_SECONDS * 1000);
    if ((await generateTOTP(secret, at)) === token.trim()) return true;
  }
  return false;
}

export function buildOtpauthUrl(secret: string, account: string, issuer: string): string {
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(CODE_DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?${params.toString()}`;
}

export function generateBackupCodes(count = BACKUP_CODE_COUNT, length = BACKUP_CODE_LENGTH): string[] {
  const codes: string[] = [];
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(length);
    webCrypto().getRandomValues(bytes);
    let code = "";
    for (let j = 0; j < length; j++) {
      code += charset[bytes[j] % charset.length];
    }
    codes.push(code);
  }
  return codes;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await webCrypto().subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashBackupCodes(codes: string[]): Promise<string> {
  const hashed = await Promise.all(codes.map((code) => sha256Hex(code)));
  return JSON.stringify(hashed);
}

export async function verifyBackupCode(hashedJson: string | null | undefined, code: string): Promise<boolean> {
  if (!hashedJson) return false;
  try {
    const hashed: string[] = JSON.parse(hashedJson);
    const candidate = await sha256Hex(code.trim().toUpperCase());
    return hashed.includes(candidate);
  } catch {
    return false;
  }
}

export async function removeBackupCode(hashedJson: string | null | undefined, code: string): Promise<string | null> {
  if (!hashedJson) return null;
  try {
    const hashed: string[] = JSON.parse(hashedJson);
    const candidate = await sha256Hex(code.trim().toUpperCase());
    const remaining = hashed.filter((h) => h !== candidate);
    return remaining.length ? JSON.stringify(remaining) : null;
  } catch {
    return null;
  }
}