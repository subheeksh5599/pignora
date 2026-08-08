import crypto from "node:crypto";

/**
 * Cleanverse cooperate API encryption (API v5.6 docs):
 *  - Algorithm: AES
 *  - Mode: CBC / PKCS5Padding (PKCS7 in Node)
 *  - IV: fixed 16 zero bytes
 *  - Key: Base64-decoded api-key (never sent over the wire)
 *  - Body: {"data": "<Base64 ciphertext>"}
 */

const ZERO_IV = Buffer.alloc(16, 0);

function aesKey(apiKeyB64) {
  const key = Buffer.from(apiKeyB64, "base64");
  if (key.length !== 16 && key.length !== 24 && key.length !== 32) {
    throw new Error(`api-key decodes to ${key.length} bytes; expected 16/24/32 (AES-128/192/256)`);
  }
  return key;
}

export function encryptBody(plain, apiKeyB64) {
  const cipher = crypto.createCipheriv("aes-256-cbc", aesKey(apiKeyB64), ZERO_IV);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(plain), "utf8"), cipher.final()]);
  return JSON.stringify({ data: encrypted.toString("base64") });
}

export function decryptBody(encrypted, apiKeyB64) {
  const body = typeof encrypted === "string" ? JSON.parse(encrypted) : encrypted;
  const data = body.data ?? body;
  const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey(apiKeyB64), ZERO_IV);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8"));
}
