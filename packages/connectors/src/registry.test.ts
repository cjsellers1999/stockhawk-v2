import { describe, expect, it } from "vitest";

import { createFixtureConnectorAdapter } from "./fixture/fixture-adapter.js";
import { ConnectorRegistry, connectorRegistryFailure } from "./registry.js";
import { fixtureIntegration } from "./fixture/fixture-integration.js";

describe("Connector Registry", () => {
  it("resolves only an exact registered Adapter version", () => {
    const adapter = createFixtureConnectorAdapter();
    const registry = new ConnectorRegistry([adapter]);

    expect(
      registry.resolve({
        id: adapter.manifest.id,
        version: adapter.manifest.version,
      }),
    ).toBe(adapter);
    expect(
      registry.resolve({ id: adapter.manifest.id, version: "2.0.0" }),
    ).toBeUndefined();
  });

  it("isolates a missing Adapter as a typed failure", () => {
    expect(
      connectorRegistryFailure({
        adapterId: "missing",
        adapterVersion: "1.0.0",
      }),
    ).toEqual(
      expect.objectContaining({
        code: "adapter-unavailable",
        outcome: "failed",
        retrySafety: "after-repair",
      }),
    );
  });

  it("validates the exact Adapter configuration schema version at resolution", () => {
    const adapter = createFixtureConnectorAdapter();
    const registry = new ConnectorRegistry([adapter]);

    expect(registry.resolveIntegration(fixtureIntegration)).toBe(adapter);
    expect(
      registry.resolveIntegration({
        ...fixtureIntegration,
        adapter: {
          ...fixtureIntegration.adapter,
          configurationVersion: 2,
        },
      }),
    ).toEqual(
      expect.objectContaining({
        code: "adapter-fault",
        outcome: "failed",
        stage: "registry",
      }),
    );
    expect(
      registry.resolveIntegration({
        ...fixtureIntegration,
        certificationRecipe: {
          method: "cursor",
          requiredEvidence: ["count"],
          schemaVersion: 1,
        },
      }),
    ).toEqual(
      expect.objectContaining({
        code: "adapter-fault",
        outcome: "failed",
        stage: "registry",
      }),
    );
    expect(
      registry.resolveIntegration({
        ...fixtureIntegration,
        certificationRecipe: {
          method: "sitemap",
          requiredEvidence: ["count"],
          schemaVersion: 1,
        },
      }),
    ).toEqual(
      expect.objectContaining({
        code: "adapter-fault",
        outcome: "failed",
        stage: "registry",
      }),
    );
    expect(
      registry.resolveIntegration({
        ...fixtureIntegration,
        adapterOptions: {
          ...fixtureIntegration.adapterOptions,
          catalogPath: "/catalog?view=all",
        },
      }),
    ).toEqual(
      expect.objectContaining({
        code: "adapter-fault",
        outcome: "failed",
        stage: "registry",
      }),
    );
  });
});
