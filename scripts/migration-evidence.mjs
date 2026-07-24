export const collectMigrationEvidence = async (sha256) => ({
  migrationSha256: {
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
  schemaVersion: "0002_seed_onboarding",
});
