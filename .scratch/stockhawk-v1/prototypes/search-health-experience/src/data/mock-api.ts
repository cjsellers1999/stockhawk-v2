import { mockOffers, mockStorefronts } from "./mock-data";
import type { Offer, StoreCommandRequest, Storefront } from "../stockhawk.types";

let storefrontServerState = structuredClone(mockStorefronts);

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export async function fetchOffers(): Promise<Offer[]> {
  await wait(80);
  return structuredClone(mockOffers);
}

export async function fetchStorefronts(): Promise<Storefront[]> {
  await wait(80);
  return structuredClone(storefrontServerState);
}

export async function queueStoreCommand(
  request: StoreCommandRequest,
): Promise<StoreCommandRequest> {
  await wait(750);

  storefrontServerState = storefrontServerState.map((storefront) => {
    if (storefront.id !== request.storeId) return storefront;

    return {
      ...storefront,
      command: {
        state: "queued",
        label: "Queued",
        requestedAt: "just now",
      },
    };
  });

  return request;
}

export function resetMockServer(): void {
  storefrontServerState = structuredClone(mockStorefronts);
}
