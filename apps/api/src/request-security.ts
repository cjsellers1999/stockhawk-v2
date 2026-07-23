import { createHash, timingSafeEqual } from "node:crypto";

export const sessionCookieName = "stockhawk_session";
export const csrfCookieName = "stockhawk_csrf";

export const hashOpaqueToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const tokensMatch = (left: string, right: string) => {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
};

export const parseCookies = (header: string | undefined) => {
  const cookies = new Map<string, string>();
  for (const part of header?.split(";") ?? []) {
    const separator = part.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    cookies.set(name, value);
  }
  return cookies;
};

export const serializeCookie = ({
  httpOnly,
  maxAgeSeconds,
  name,
  secure,
  value,
}: {
  httpOnly: boolean;
  maxAgeSeconds: number;
  name: string;
  secure: boolean;
  value: string;
}) => {
  const attributes = [
    `${name}=${value}`,
    "Path=/",
    ...(httpOnly ? ["HttpOnly"] : []),
    "SameSite=Strict",
    `Max-Age=${maxAgeSeconds}`,
    ...(secure ? ["Secure"] : []),
  ];
  return attributes.join("; ");
};

export const createLoginThrottle = ({
  maxFailures,
  windowMs,
}: {
  maxFailures: number;
  windowMs: number;
}) => {
  let attempts: number[] = [];
  const prune = (now: number) => {
    attempts = attempts.filter((attempt) => attempt > now - windowMs);
  };

  return {
    clear: () => {
      attempts = [];
    },
    recordAttempt: (now: number) => {
      prune(now);
      attempts.push(now);
    },
    retryAfterSeconds: (now: number) => {
      prune(now);
      const firstAttempt = attempts[0];
      if (attempts.length < maxFailures || firstAttempt === undefined) {
        return null;
      }
      return Math.max(1, Math.ceil((firstAttempt + windowMs - now) / 1_000));
    },
  };
};
