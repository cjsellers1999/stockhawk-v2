import type { StorefrontIntegration } from "@stockhawk/contracts";

export const fixtureIntegration = {
  adapter: {
    configurationVersion: 1,
    id: "fixture-http",
    version: "1.0.0",
  },
  adapterOptions: {
    catalogPath: "/catalog",
    stockPath: "/stock",
  },
  approvedOrigins: ["https://fixture.store", "https://linked.fixture.store"],
  browserAccessGrant: null,
  canonicalOrigin: "https://fixture.store",
  catalogRoots: ["https://fixture.store/catalog"],
  certificationRecipe: {
    method: "cursor",
    requiredEvidence: ["route", "cursor_closure", "variant_closure"],
    schemaVersion: 1,
  },
  expectedSurfaceFingerprint: "fixture-catalog-v1",
  identity: "int_fixture_store_v1",
  initialPacing: {
    maximumConcurrentRequests: 1,
    minimumIntervalMilliseconds: 100,
  },
  locale: "en-US",
  region: "US",
  schemaVersion: 1,
  storefrontIdentity: "stf_fixture_store",
} satisfies StorefrontIntegration;
