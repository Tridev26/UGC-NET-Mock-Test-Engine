/**
 * Cryptographic utilities for secure, anonymous authentication.
 * Uses the standard Web Crypto API (SHA-256 with per-user salt).
 */

// Converts ArrayBuffer to hex string
function bufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  let hexString = '';
  for (let i = 0; i < byteArray.byteLength; i++) {
    hexString += byteArray[i].toString(16).padStart(2, '0');
  }
  return hexString;
}

// Generate a cryptographically secure random salt
export function generateSalt(length: number = 16): string {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  let salt = '';
  for (let i = 0; i < array.length; i++) {
    salt += array[i].toString(16).padStart(2, '0');
  }
  return salt;
}

// Hash password with salt using SHA-256
export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  // Combine password with unique salt
  const data = encoder.encode(`${password}:${salt}:ugc_net_secure_salt`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

// Verify entered password against stored hash and salt
export async function verifyPassword(
  attemptedPassword: string,
  storedHash: string,
  salt: string
): Promise<boolean> {
  const calculatedHash = await hashPassword(attemptedPassword, salt);
  return calculatedHash === storedHash;
}
