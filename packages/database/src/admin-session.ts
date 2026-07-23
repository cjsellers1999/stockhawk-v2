import { and, eq, gt } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { adminSession, schema } from "./schema.js";

type StockHawkDatabase = PostgresJsDatabase<typeof schema>;

export type AdminSessionRecord = {
  csrfTokenHash: string;
  expiresAt: Date;
  id: number;
  sessionTokenHash: string;
};

export type AdminSessionStore = {
  createAdminSession: (
    session: Omit<AdminSessionRecord, "id">,
  ) => Promise<AdminSessionRecord>;
  findActiveAdminSession: (input: {
    now: Date;
    sessionTokenHash: string;
  }) => Promise<AdminSessionRecord | null>;
};

const toRecord = (
  row: typeof adminSession.$inferSelect,
): AdminSessionRecord => ({
  csrfTokenHash: row.csrfTokenHash,
  expiresAt: row.expiresAt,
  id: row.id,
  sessionTokenHash: row.sessionTokenHash,
});

export const createAdminSessionStore = (
  database: StockHawkDatabase,
): AdminSessionStore => ({
  createAdminSession: async (session) => {
    const [created] = await database
      .insert(adminSession)
      .values(session)
      .returning();
    if (created === undefined) {
      throw new Error("Admin session was not persisted");
    }
    return toRecord(created);
  },
  findActiveAdminSession: async ({ now, sessionTokenHash }) => {
    const [active] = await database
      .select()
      .from(adminSession)
      .where(
        and(
          eq(adminSession.sessionTokenHash, sessionTokenHash),
          gt(adminSession.expiresAt, now),
        ),
      )
      .limit(1);
    return active === undefined ? null : toRecord(active);
  },
});
