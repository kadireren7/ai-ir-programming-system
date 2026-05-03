import crypto from "crypto";

const ALGO = "aes-256-gcm";
const KEY_ENV = "TORQA_TOKEN_ENCRYPTION_KEY";

function getKey(): Buffer {
  const raw = process.env[KEY_ENV];
  if (!raw) throw new Error(`${KEY_ENV} is not set`);
  const buf = Buffer.from(raw, "hex");
  if (buf.length !== 32) throw new Error(`${KEY_ENV} must be 32 bytes (64 hex chars)`);
  return buf;
}

/**
 * Encrypts plaintext to "iv:authTag:ciphertext" (all base64).
 */
export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

/**
 * Decrypts a value produced by encryptToken.
 */
export function decryptToken(encrypted: string): string {
  const key = getKey();
  const parts = encrypted.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted token format");
  const [ivB64, authTagB64, cipherB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(cipherB64, "base64");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}

/** Returns last 4 chars of a token for display hint. */
export function tokenHint(token: string): string {
  return `••••${token.slice(-4)}`;
}
