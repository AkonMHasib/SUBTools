// Standard RFC 6238 TOTP (Time-based One-Time Password) implementation in standard browser Web Crypto API
// Compatible with Google Authenticator, Microsoft Authenticator, Authy, Apple Keychain, 1Password

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Encodes an ArrayBuffer or Uint8Array to a Base32 string (without padding)
 */
export const base32Encode = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let bits = "";
  for (let i = 0; i < bytes.length; i++) {
    bits += bytes[i].toString(2).padStart(8, "0");
  }

  let base32 = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5);
    const index = parseInt(chunk, 2);
    base32 += BASE32_ALPHABET[index];
  }
  return base32;
};

/**
 * Decodes a Base32 string into a Uint8Array
 */
export const base32Decode = (base32) => {
  const clean = base32.toUpperCase().replace(/[\s=-]/g, "");
  let bits = "";
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_ALPHABET.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
};

/**
 * Generates a random 20-byte (160-bit) Base32 secret for TOTP setup
 */
export const generateTotpSecret = () => {
  const randomBytes = new Uint8Array(20);
  window.crypto.getRandomValues(randomBytes);
  return base32Encode(randomBytes);
};

/**
 * Builds the standard otpauth:// URL for Authenticator app scanning
 */
export const generateOtpAuthUri = (accountName, secret, issuer = "SUBTools Admin") => {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
};

/**
 * Generates the expected 6-digit TOTP code for a given timestamp counter
 */
export const computeTotpCode = async (secret, counter) => {
  const keyBytes = base32Decode(secret);
  if (keyBytes.length === 0) return null;

  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const counterBuffer = new ArrayBuffer(8);
  const counterView = new DataView(counterBuffer);
  // Big-endian 64-bit counter representation
  counterView.setUint32(0, Math.floor(counter / 0x100000000));
  counterView.setUint32(4, counter >>> 0);

  const signature = await window.crypto.subtle.sign("HMAC", cryptoKey, counterBuffer);
  const hash = new Uint8Array(signature);

  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, "0");
};

/**
 * Verifies a 6-digit user input code against the secret with a window allowance of +/- 1 interval (90s window)
 */
export const verifyTotpCode = async (secret, inputCode, timeStep = 30) => {
  if (!secret || !inputCode) return false;
  const cleanInput = String(inputCode).trim().replace(/\s/g, "");
  if (!/^\d{6}$/.test(cleanInput)) return false;

  const currentCounter = Math.floor(Date.now() / 1000 / timeStep);

  // Check counter - 1, counter, counter + 1 to account for subtle clock drift
  for (let offset = -1; offset <= 1; offset++) {
    const expected = await computeTotpCode(secret, currentCounter + offset);
    if (expected === cleanInput) {
      return true;
    }
  }
  return false;
};

export default {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  generateOtpAuthUri,
  computeTotpCode,
  verifyTotpCode,
};
