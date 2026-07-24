export const collectMigrationEvidence = async (sha256) => ({
  migrationSha256: {
    connectorRawIngress: await sha256(
      "packages/database/migrations/0004_connector_raw_ingress.sql",
    ),
    connectorRuns: await sha256(
      "packages/database/migrations/0003_connector_runs.sql",
    ),
    pgBoss: await sha256(
      "packages/database/migrations/0001_pgboss_12_26_2.sql",
    ),
    seedOnboarding: await sha256(
      "packages/database/migrations/0002_seed_onboarding.sql",
    ),
    stockHawk: await sha256(
      "packages/database/migrations/0000_stockhawk_baseline.sql",
    ),
  },
  schemaVersion: "0004_connector_raw_ingress",
});
