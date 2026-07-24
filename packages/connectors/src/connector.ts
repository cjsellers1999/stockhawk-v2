import {
  catalogDiscoveryCompletionSchema,
  connectorFailureSchema,
  connectorObservationBatchSchema,
  stockMonitoringCompletionSchema,
  type CatalogDiscoveryCompletion,
  type ConnectorAdapterManifest,
  type ConnectorCheckpoint,
  type ConnectorFailure,
  type ConnectorObservationBatch,
  type StockMonitoringCompletion,
  type StockMonitoringTarget,
  type StorefrontIntegration,
} from "@stockhawk/contracts";
import type { ZodType } from "zod";

import type { CrawlRequestBroker } from "./broker.js";

export type ConnectorRunContext = {
  broker: CrawlRequestBroker;
  runIdentity: string;
  signal: AbortSignal;
};

export type CatalogDiscoveryInput = {
  checkpoint: ConnectorCheckpoint | null;
  integration: StorefrontIntegration;
  runContext: ConnectorRunContext;
};

export type StockMonitoringInput = CatalogDiscoveryInput & {
  targets: StockMonitoringTarget[];
};

export type ConnectorProgressEvent = {
  batch: ConnectorObservationBatch;
  type: "observation_batch";
};

export type CatalogDiscoveryRun = AsyncGenerator<
  ConnectorProgressEvent,
  CatalogDiscoveryCompletion | ConnectorFailure,
  undefined
>;

export type StockMonitoringRun = AsyncGenerator<
  ConnectorProgressEvent,
  StockMonitoringCompletion | ConnectorFailure,
  undefined
>;

export type ConnectorAdapter = {
  certificationRecipeSchema: ZodType;
  configurationSchema: ZodType;
  discoverCatalog: (input: CatalogDiscoveryInput) => CatalogDiscoveryRun;
  manifest: ConnectorAdapterManifest;
  monitorStock: (input: StockMonitoringInput) => StockMonitoringRun;
};

const connectorTerminalSchema = catalogDiscoveryCompletionSchema
  .or(stockMonitoringCompletionSchema)
  .or(connectorFailureSchema);

type ConnectorTerminal =
  CatalogDiscoveryCompletion | ConnectorFailure | StockMonitoringCompletion;

export const collectConnectorRun = async (
  run: AsyncGenerator<ConnectorProgressEvent, ConnectorTerminal, undefined>,
): Promise<{
  events: ConnectorProgressEvent[];
  terminal: ConnectorTerminal;
}> => {
  const events: ConnectorProgressEvent[] = [];
  while (true) {
    // Async Generator events are ordered progress; each next value depends on consumption.
    // eslint-disable-next-line no-await-in-loop
    const result = await run.next();
    if (result.done) {
      return {
        events,
        terminal: connectorTerminalSchema.parse(result.value),
      };
    }
    events.push({
      batch: connectorObservationBatchSchema.parse(result.value.batch),
      type: "observation_batch",
    });
  }
};
