import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";

const cost = 32_768;
const blockSize = 8;
const parallelization = 1;
const keyLength = 32;
const maxMemory = 64 * 1024 * 1024;
const prefix = `scrypt$${cost}$${blockSize}$${parallelization}`;

type ParsedPasswordHash = {
  digest: Buffer;
  salt: Buffer;
};

const derive = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      keyLength,
      {
        N: cost,
        maxmem: maxMemory,
        p: parallelization,
        r: blockSize,
      },
      (error, derivedKey) => {
        if (error === null) {
          resolve(derivedKey);
        } else {
          reject(error);
        }
      },
    );
  });

const parsePasswordHash = (encoded: string): ParsedPasswordHash => {
  const [
    algorithm,
    encodedCost,
    encodedBlockSize,
    encodedParallelization,
    encodedSalt,
    encodedDigest,
  ] = encoded.split("$");
  if (
    algorithm !== "scrypt" ||
    encodedCost !== String(cost) ||
    encodedBlockSize !== String(blockSize) ||
    encodedParallelization !== String(parallelization) ||
    encodedSalt === undefined ||
    encodedDigest === undefined
  ) {
    throw new Error("Invalid admin password hash configuration");
  }

  const salt = Buffer.from(encodedSalt, "base64url");
  const digest = Buffer.from(encodedDigest, "base64url");
  if (salt.length < 16 || digest.length !== keyLength) {
    throw new Error("Invalid admin password hash configuration");
  }
  return { digest, salt };
};

export const hashAdminPassword = async (
  password: string,
  options: { salt?: Buffer } = {},
) => {
  const salt = options.salt ?? randomBytes(16);
  if (password.length === 0 || salt.length < 16) {
    throw new Error("Admin password and a 16-byte salt are required");
  }
  const digest = await derive(password, salt);
  return `${prefix}$${salt.toString("base64url")}$${digest.toString("base64url")}`;
};

export const createAdminPasswordVerifier = (encoded: string) => {
  const { digest, salt } = parsePasswordHash(encoded);
  return async (password: string) => {
    const candidate = await derive(password, salt);
    return timingSafeEqual(candidate, digest);
  };
};
