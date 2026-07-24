import {
  connectorAdapterManifestSchema,
  type ConnectorFailure,
  type StorefrontIntegration,
} from "@stockhawk/contracts";

import type { ConnectorAdapter } from "./connector.js";
import { createEmptyConnectorRunMetrics } from "./metrics.js";

const registryKey = ({ id, version }: { id: string; version: string }) =>
  `${id}@${version}`;

export class ConnectorRegistry {
  readonly #adapters: Map<string, ConnectorAdapter>;

  constructor(adapters: ConnectorAdapter[]) {
    this.#adapters = new Map(
      adapters.map((adapter) => {
        const manifest = connectorAdapterManifestSchema.parse(adapter.manifest);
        return [registryKey(manifest), adapter];
      }),
    );
    if (this.#adapters.size !== adapters.length) {
      throw new Error(
        "Connector Registry contains a duplicate Adapter version",
      );
    }
  }

  resolve(reference: { id: string; version: string }) {
    return this.#adapters.get(registryKey(reference));
  }

  resolveIntegration(
    integration: StorefrontIntegration,
  ): ConnectorAdapter | ConnectorFailure {
    const adapter = this.resolve(integration.adapter);
    if (adapter === undefined) {
      return connectorRegistryFailure({
        adapterId: integration.adapter.id,
        adapterVersion: integration.adapter.version,
      });
    }
    if (
      integration.adapter.configurationVersion !==
        adapter.manifest.configurationSchemaVersion ||
      !adapter.configurationSchema.safeParse(integration.adapterOptions)
        .success ||
      !adapter.certificationRecipeSchema.safeParse(
        integration.certificationRecipe,
      ).success
    ) {
      return connectorConfigurationFailure({
        adapterId: integration.adapter.id,
        adapterVersion: integration.adapter.version,
      });
    }
    return adapter;
  }
}

export const connectorRegistryFailure = ({
  adapterId,
  adapterVersion,
}: {
  adapterId: string;
  adapterVersion: string;
}): ConnectorFailure => ({
  checkpoint: null,
  code: "adapter-unavailable",
  evidenceArtifact: null,
  evidenceIdentity: null,
  message: `Connector Adapter ${adapterId}@${adapterVersion} is unavailable`,
  metrics: createEmptyConnectorRunMetrics(),
  outcome: "failed",
  retryAt: null,
  retrySafety: "after-repair",
  stage: "registry",
});

const connectorConfigurationFailure = ({
  adapterId,
  adapterVersion,
}: {
  adapterId: string;
  adapterVersion: string;
}): ConnectorFailure => ({
  checkpoint: null,
  code: "adapter-fault",
  evidenceArtifact: null,
  evidenceIdentity: null,
  message: `Connector Adapter ${adapterId}@${adapterVersion} configuration is invalid`,
  metrics: createEmptyConnectorRunMetrics(),
  outcome: "failed",
  retryAt: null,
  retrySafety: "after-repair",
  stage: "registry",
});
