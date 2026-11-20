import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function generateDek(): Buffer {
  return crypto.randomBytes(32);
}

export function deriveKey(pin: string, saltHex: string): Buffer {
  return crypto.scryptSync(pin, Buffer.from(saltHex, 'hex'), 32, SCRYPT_PARAMS);
}

export function hashVerifier(pin: string, saltHex: string): string {
  const derived = crypto.scryptSync(`verify:${pin}`, Buffer.from(saltHex, 'hex'), 32, SCRYPT_PARAMS);
  return derived.toString('hex');
}

export function verifyPin(pin: string, saltHex: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashVerifier(pin, saltHex), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

export function encryptBuffer(plain: Buffer, key: Buffer): { cipherHex: string; ivHex: string; tagHex: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    cipherHex: encrypted.toString('hex'),
    ivHex: iv.toString('hex'),
    tagHex: tag.toString('hex'),
  };
}

export function decryptBuffer(cipherHex: string, ivHex: string, tagHex: string, key: Buffer): Buffer {
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(cipherHex, 'hex')), decipher.final()]);
}

export function encryptText(plaintext: string | null | undefined, key: Buffer): string | null {
  if (plaintext === null || plaintext === undefined || plaintext === '') return null;
  const { cipherHex, ivHex, tagHex } = encryptBuffer(Buffer.from(plaintext, 'utf8'), key);
  return `enc:v1:${ivHex}:${tagHex}:${cipherHex}`;
}

export function decryptText(payload: string | null | undefined, key: Buffer): string {
  if (!payload) return '';
  if (!payload.startsWith('enc:v1:')) return payload; // legacy unencrypted before setup
  const parts = payload.split(':');
  if (parts.length !== 5) return '';
  const [, , ivHex, tagHex, cipherHex] = parts;
  return decryptBuffer(cipherHex, ivHex, tagHex, key).toString('utf8');
}
