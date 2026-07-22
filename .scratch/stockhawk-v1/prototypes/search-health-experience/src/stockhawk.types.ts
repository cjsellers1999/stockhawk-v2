export type PrototypeVariant = "A" | "B" | "C";
export type AppPage = "search" | "health";
export type Theme = "light" | "dark";
export type ResultView = "flat" | "store";
export type StockStatus = "in stock" | "out of stock" | "preorder" | "unknown";
export type MatchStatus = "confirmed" | "provisional";
export type Presence = "active" | "inactive";
export type ImageSource = "retailer" | "official" | "none";
export type HealthAttention =
  | "repair"
  | "healthy"
  | "partial"
  | "recovering"
  | "degraded"
  | "dormant"
  | "dead"
  | "candidate";
export type CommandState = "idle" | "queued";

export interface Offer {
  id: string;
  title: string;
  canonicalTitle: string;
  retailer: string;
  siteUrl: string;
  storeId: string;
  listingUrl: string;
  stock: StockStatus;
  checkedMinutes: number;
  price: string;
  match: MatchStatus;
  coverage: "Certified" | "Partial";
  presence: Presence;
  imageSource: ImageSource;
  palette: readonly [string, string, string];
}

export interface Storefront {
  id: string;
  kind: "storefront" | "candidate";
  name: string;
  siteUrl: string;
  attention: HealthAttention;
  disposition: string;
  catalogAccess: string;
  stockAccess: string;
  catalogCoverage: string;
  catalogFreshness: string;
  answered: number;
  eligible: number;
  unknown: number;
  remediation: string;
  next: string;
  connector: string;
  lastSuccess: string;
  reason: string;
  affected: string;
  command: {
    state: CommandState;
    label: string;
    requestedAt?: string;
  };
}

export interface UrlState {
  variant: PrototypeVariant;
  page: AppPage;
  theme: Theme;
  view: ResultView;
  chips: string[];
  stock: "all" | StockStatus;
  match: "all" | MatchStatus;
  includeHistorical: boolean;
  pageNumber: number;
  healthFilter: "all" | "attention" | "healthy" | "dormant" | "dead";
  selectedOfferId: string;
  selectedStoreId: string;
}

export interface StoreCommandRequest {
  storeId: string;
  action: "retry" | "discover" | "reaudit";
}
