import postgres from "postgres";

export type Database = {
  check: () => Promise<boolean>;
  close: () => Promise<void>;
  markWorkerReady: () => Promise<void>;
  workerIsReady: () => Promise<boolean>;
};

export const createDatabase = (url: string): Database => {
  const sql = postgres(url, { max: 5 });

  return {
    check: async () => {
      try {
        await sql`select 1`;
        return true;
      } catch {
        return false;
      }
    },
    close: async () => sql.end(),
    markWorkerReady: async () => {
      await sql`
        insert into service_heartbeat (service_name, observed_at)
        values ('worker', now())
        on conflict (service_name)
        do update set observed_at = excluded.observed_at
      `;
    },
    workerIsReady: async () => {
      try {
        const result = await sql<{ ready: boolean }[]>`
          select coalesce(max(observed_at) > now() - interval '30 seconds', false) as ready
          from service_heartbeat
          where service_name = 'worker'
        `;
        return result[0]?.ready ?? false;
      } catch {
        return false;
      }
    },
  };
};
