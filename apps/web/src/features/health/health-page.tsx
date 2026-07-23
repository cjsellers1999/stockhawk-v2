import { RefreshCw } from "lucide-react";

import { Button } from "../../components/ui/button.js";

const summaries = [
  ["Monitoring coverage", "Unassessed"],
  ["Restock freshness", "Unassessed"],
  ["Catalog coverage", "Unassessed"],
  ["Repair required", "0"],
] as const;

export const HealthPage = () => (
  <section aria-labelledby="health-title">
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold" id="health-title">
          Health
        </h1>
        <p className="mt-1 text-muted-foreground">
          Independent collection facts, prioritized by buying impact and repair
          leverage.
        </p>
      </div>
      <Button variant="ghost">
        <RefreshCw aria-hidden="true" size={16} />
        Refresh
      </Button>
    </div>
    <div className="mb-6 grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
      {summaries.map(([label, value]) => (
        <div
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
          key={label}
        >
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 text-lg font-semibold">{value}</div>
        </div>
      ))}
    </div>
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border p-4">
        <h2 className="font-semibold">Storefronts</h2>
        <p className="text-xs text-muted-foreground">Ordered by owner impact</p>
      </div>
      <p className="p-8 text-center text-muted-foreground">
        No Storefronts onboarded. Access, catalog, monitoring, freshness, and
        lifecycle remain unassessed.
      </p>
    </div>
  </section>
);
