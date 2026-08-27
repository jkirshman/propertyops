import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

const SALT_LENGTH_BYTES = 16;
const KEY_LENGTH_BYTES = 64;

export async function hashPassword(password: string): Promise<{ salt: string; hash: string }> {
  const salt = randomBytes(SALT_LENGTH_BYTES).toString("hex");
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH_BYTES)) as Buffer;
  return { salt, hash: derivedKey.toString("hex") };
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH_BYTES)) as Buffer;
  const expectedBuffer = Buffer.from(expectedHash, "hex");

  if (derivedKey.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, expectedBuffer);
}
