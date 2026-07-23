import { Button } from "@stockhawk/ui/button";
import { RefreshCw } from "lucide-react";

import { useHealthRefreshCommand } from "../command-boundary/use-health-refresh-command";

const summaries = [
  ["Monitoring coverage", "Unassessed"],
  ["Restock freshness", "Unassessed"],
  ["Catalog coverage", "Unassessed"],
  ["Repair required", "0"],
] as const;

export const HealthPage = () => {
  const refresh = useHealthRefreshCommand();

  return (
    <section aria-labelledby="health-title">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-heading-1" id="health-title">
            Health
          </h1>
          <p className="mt-1 text-muted-foreground">
            Independent collection facts, prioritized by buying impact and
            repair leverage.
          </p>
        </div>
        <Button
          disabled={refresh.isQueued}
          onClick={refresh.queue}
          type="button"
          variant="ghost"
        >
          <RefreshCw aria-hidden="true" data-icon="inline-start" size={16} />
          {refresh.isQueued ? "Queued" : "Refresh"}
        </Button>
      </div>
      <div className="mb-6 grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {summaries.map(([label, value]) => (
          <div
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
            key={label}
          >
            <div className="text-caption text-muted-foreground">{label}</div>
            <div className="mt-1 text-heading-3">{value}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-4">
          <h2 className="text-heading-4">Storefronts</h2>
          <p className="text-caption text-muted-foreground">
            Ordered by owner impact
          </p>
        </div>
        <p className="p-8 text-center text-muted-foreground">
          No Storefronts onboarded. Access, catalog, monitoring, freshness, and
          lifecycle remain unassessed.
        </p>
      </div>
    </section>
  );
};
