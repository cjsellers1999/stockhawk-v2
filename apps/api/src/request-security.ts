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
  maxTrackedCallers,
  windowMs,
}: {
  maxFailures: number;
  maxTrackedCallers: number;
  windowMs: number;
}) => {
  const attemptsByCaller = new Map<
    string,
    Array<{ id: symbol; recordedAt: number }>
  >();
  let nextGlobalPruneAt = 0;
  const prune = (caller: string, now: number) => {
    const attempts = (attemptsByCaller.get(caller) ?? []).filter(
      (attempt) => attempt.recordedAt > now - windowMs,
    );
    if (attempts.length === 0) {
      attemptsByCaller.delete(caller);
    } else {
      attemptsByCaller.set(caller, attempts);
    }
    return attempts;
  };
  const pruneAll = (now: number) => {
    for (const caller of attemptsByCaller.keys()) {
      prune(caller, now);
    }
    nextGlobalPruneAt = now + windowMs;
  };
  const pruneGloballyWhenDueOrFull = (caller: string, now: number) => {
    if (
      now >= nextGlobalPruneAt ||
      (!attemptsByCaller.has(caller) &&
        attemptsByCaller.size >= maxTrackedCallers)
    ) {
      pruneAll(now);
    }
  };
  const capacityRetryAfterSeconds = (now: number) => {
    let earliestExpiry = Number.POSITIVE_INFINITY;
    for (const attempts of attemptsByCaller.values()) {
      const firstAttempt = attempts[0];
      if (firstAttempt !== undefined) {
        earliestExpiry = Math.min(
          earliestExpiry,
          firstAttempt.recordedAt + windowMs,
        );
      }
    }
    return Math.max(1, Math.ceil((earliestExpiry - now) / 1_000));
  };

  return {
    clearAttempt: (caller: string, attemptId: symbol) => {
      const attempts = (attemptsByCaller.get(caller) ?? []).filter(
        (attempt) => attempt.id !== attemptId,
      );
      if (attempts.length === 0) {
        attemptsByCaller.delete(caller);
      } else {
        attemptsByCaller.set(caller, attempts);
      }
    },
    recordAttempt: (caller: string, now: number) => {
      pruneGloballyWhenDueOrFull(caller, now);
      const attempts = prune(caller, now);
      if (
        attempts.length === 0 &&
        !attemptsByCaller.has(caller) &&
        attemptsByCaller.size >= maxTrackedCallers
      ) {
        throw new Error("Login throttle caller capacity was exceeded");
      }
      const attemptId = Symbol();
      attempts.push({ id: attemptId, recordedAt: now });
      attemptsByCaller.set(caller, attempts);
      return attemptId;
    },
    retryAfterSeconds: (caller: string, now: number) => {
      pruneGloballyWhenDueOrFull(caller, now);
      const attempts = prune(caller, now);
      if (
        attempts.length === 0 &&
        !attemptsByCaller.has(caller) &&
        attemptsByCaller.size >= maxTrackedCallers
      ) {
        return capacityRetryAfterSeconds(now);
      }
      const firstAttempt = attempts[0];
      if (attempts.length < maxFailures || firstAttempt === undefined) {
        return null;
      }
      return Math.max(
        1,
        Math.ceil((firstAttempt.recordedAt + windowMs - now) / 1_000),
      );
    },
  };
};
