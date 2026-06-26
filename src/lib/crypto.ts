/**
 * Web Crypto-based encryption for sensitive data stored in localStorage.
 * Uses AES-GCM with a device-derived key (not a fixed password).
 *
 * This is not unbreakable (the key is derived from browser/navigator
 * properties that an attacker with local access could reconstruct), but
 * it prevents casual plaintext exposure. For production, replace with
 * OS-level credential storage (Tauri safe-storage plugin, keytar, etc.).
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

/** Derive a device-unique key from stable navigator properties. */
function getDeviceKeyMaterial(): string {
  const parts = [
    navigator.userAgent,
    navigator.language,
    (navigator as any).deviceMemory || '8',
    screen.height,
    screen.width,
    screen.colorDepth,
  ];
  return parts.join('|');
}

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const material = getDeviceKeyMaterial();
  const enc = new TextEncoder();

  // Import as key material for PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(material),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Use a fixed salt (unique per app, not per-user, so it's deterministic)
  const salt = enc.encode('agent-studio-v1');
  cachedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );

  return cachedKey;
}

/** Encrypt a plaintext string. Returns base64-encoded ciphertext. */
export async function encryptValue(plaintext: string): Promise<string> {
  try {
    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      encoded
    );
    // Prepend IV to ciphertext, then base64 encode
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return btoa(String.fromCharCode(...combined));
  } catch {
    // Fallback: if crypto is unavailable, store as-is
    return plaintext;
  }
}

/** Decrypt a base64-encoded ciphertext. Returns plaintext. */
export async function decryptValue(ciphertext: string): Promise<string> {
  try {
    const key = await getKey();
    const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, IV_LENGTH);
    const data = combined.slice(IV_LENGTH);
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    // Fallback: if decryption fails (e.g., different device), return as-is
    return ciphertext;
  }
}
