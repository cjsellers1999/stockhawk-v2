import type { ConnectorRunMetrics } from "@stockhawk/contracts";

export const createEmptyConnectorRunMetrics = (): ConnectorRunMetrics => ({
  activeMilliseconds: 0,
  browserOperations: 0,
  bytesReceived: 0,
  cacheHits: 0,
  challenges: 0,
  conditionalNotModified: 0,
  httpOperations: 0,
  itemCount: 0,
  maximumRequestMilliseconds: 0,
  rateLimits: 0,
  requestEquivalentCost: 0,
  requestMilliseconds: 0,
  retries: 0,
  schedulerWaitMilliseconds: 0,
  serverRetryAt: null,
  targetCount: 0,
  variantCount: 0,
});
