import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  useReactTable,
  type ExpandedState,
  type SortingState,
} from "@tanstack/react-table";
import { StatusBadge } from "../../components/status-badge";
import { fetchStorefronts, queueStoreCommand } from "../../data/mock-api";
import { stockhawkQueryKeys } from "../../data/stockhawk-query-keys";
import { useOptimisticCommandMutation } from "../../data/use-optimistic-command-mutation";
import type {
  StoreCommandRequest,
  Storefront,
  UrlState,
} from "../../stockhawk.types";

interface HealthPageProps {
  state: UrlState;
  updateState: (changes: Partial<UrlState>) => void;
}

const columnHelper = createColumnHelper<Storefront>();

function commandAction(storefront: Storefront): StoreCommandRequest["action"] {
  if (storefront.command.label === "Run discovery") return "discover";
  if (storefront.command.label === "Re-audit") return "reaudit";
  return "retry";
}

function filterStorefronts(storefronts: Storefront[], filter: UrlState["healthFilter"]): Storefront[] {
  if (filter === "all") return storefronts;
  if (filter === "healthy") return storefronts.filter((storefront) => storefront.attention === "healthy");
  if (filter === "dormant") return storefronts.filter((storefront) => storefront.attention === "dormant");
  if (filter === "dead") return storefronts.filter((storefront) => storefront.attention === "dead");
  return storefronts.filter((storefront) =>
    ["repair", "partial", "recovering", "degraded"].includes(storefront.attention),
  );
}

function optimisticQueue(
  current: Storefront[] | undefined,
  request: StoreCommandRequest,
): Storefront[] {
  return (current ?? []).map((storefront) => {
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
}

export function HealthPage({ state, updateState }: HealthPageProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>(true);
  const storefrontsQuery = useQuery({
    queryKey: stockhawkQueryKeys.storefronts(),
    queryFn: fetchStorefronts,
  });
  const { mutate: queueCommand } = useOptimisticCommandMutation<
    StoreCommandRequest,
    StoreCommandRequest,
    Storefront[]
  >({
    mutationFn: queueStoreCommand,
    queryKey: stockhawkQueryKeys.storefronts(),
    optimisticUpdate: optimisticQueue,
  });
  const visibleStorefronts = useMemo(
    () => filterStorefronts(storefrontsQuery.data ?? [], state.healthFilter),
    [state.healthFilter, storefrontsQuery.data],
  );
  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Storefront",
        cell: ({ row }) => (
          <button
            type="button"
            className="text-button storefront-name"
            onClick={() => updateState({ selectedStoreId: row.original.id })}
          >
            <strong>{row.original.name}</strong>
            <span>{row.original.siteUrl}</span>
          </button>
        ),
      }),
      columnHelper.accessor("attention", {
        header: "State",
        enableGrouping: true,
        cell: ({ row, getValue }) => (
          <div className="health-state-cell">
            <StatusBadge tone={getValue()}>{row.original.remediation}</StatusBadge>
            <span>{row.original.disposition}</span>
          </div>
        ),
      }),
      columnHelper.accessor("catalogAccess", {
        header: "Catalog access",
        cell: ({ getValue }) => <StatusBadge tone={getValue()}>{getValue()}</StatusBadge>,
      }),
      columnHelper.accessor("stockAccess", {
        header: "Stock access",
        cell: ({ getValue }) => <StatusBadge tone={getValue()}>{getValue()}</StatusBadge>,
      }),
      columnHelper.accessor("catalogCoverage", {
        header: "Coverage",
        cell: ({ row, getValue }) => (
          <div className="coverage-cell">
            <strong>{getValue()}</strong>
            <span>{row.original.catalogFreshness}</span>
          </div>
        ),
      }),
      columnHelper.accessor("eligible", {
        header: "Stock answers",
        cell: ({ row }) => (
          <div className="answer-cell">
            <strong>
              {row.original.answered}/{row.original.eligible}
            </strong>
            <span>{row.original.unknown} unknown</span>
          </div>
        ),
      }),
      columnHelper.accessor("next", {
        header: "Next",
        cell: ({ row, getValue }) => (
          <div className="next-cell">
            <span>{getValue()}</span>
            <small>{row.original.lastSuccess}</small>
          </div>
        ),
      }),
      columnHelper.display({
        id: "action",
        header: "Action",
        cell: ({ row }) => {
          const storefront = row.original;
          const isQueued = storefront.command.state === "queued";

          return (
            <button
              type="button"
              className={isQueued ? "command-button queued" : "command-button"}
              disabled={isQueued}
              onClick={() =>
                queueCommand({
                  storeId: storefront.id,
                  action: commandAction(storefront),
                })
              }
            >
              {isQueued ? "✓ Queued" : storefront.command.label}
            </button>
          );
        },
      }),
    ],
    [queueCommand, updateState],
  );
  const grouping = useMemo(
    () => (state.variant === "C" ? ["attention"] : []),
    [state.variant],
  );
  const table = useReactTable({
    data: visibleStorefronts,
    columns,
    state: { sorting, grouping, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    autoResetPageIndex: false,
    autoResetExpanded: false,
  });
  const selectedStorefront =
    visibleStorefronts.find((storefront) => storefront.id === state.selectedStoreId) ??
    visibleStorefronts[0];

  return (
    <main className="page-content">
      <div className="page-title-line">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Storefront health</h1>
        </div>
        <p>Health is evidence, never a manual switch. Missing product images do not count.</p>
      </div>
      <TelemetryStrip />
      <div className="health-filter-line">
        <div className="segmented" aria-label="Health filter">
          {(["all", "attention", "healthy", "dormant", "dead"] as const).map((filter) => (
            <button
              type="button"
              className={state.healthFilter === filter ? "active" : ""}
              key={filter}
              onClick={() => updateState({ healthFilter: filter })}
            >
              {filter === "attention" ? "Needs attention" : filter}
            </button>
          ))}
        </div>
        <span className="optimistic-note">
          Actions show Queued immediately · verified health changes later
        </span>
      </div>
      {storefrontsQuery.isPending ? <div className="linear-state">Loading storefronts…</div> : null}
      {storefrontsQuery.isError ? <div className="linear-state error">Health unavailable.</div> : null}
      {storefrontsQuery.isSuccess ? (
        <div className={state.variant === "B" ? "table-inspector-layout" : ""}>
          <div className={`table-scroll health-table variant-${state.variant}`}>
            <table>
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th className={`column-${header.column.id}`} key={header.id}>
                        {header.isPlaceholder ? null : (
                          <button
                            type="button"
                            className={header.column.getCanSort() ? "sortable-header" : "plain-header"}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? ""}
                          </button>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => {
                  if (row.getIsGrouped()) {
                    return (
                      <tr className="store-group-row" key={row.id}>
                        <td colSpan={columns.length}>
                          <button type="button" onClick={row.getToggleExpandedHandler()}>
                            <span>{row.getIsExpanded() ? "−" : "+"}</span>
                            <strong>{String(row.getValue("attention"))}</strong>
                            <small>{row.subRows.length} storefronts</small>
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      className={row.original.id === selectedStorefront?.id ? "selected-row" : ""}
                      key={row.id}
                      onClick={() => updateState({ selectedStoreId: row.original.id })}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td className={`column-${cell.column.id}`} key={cell.id}>
                          {cell.getIsPlaceholder()
                            ? null
                            : flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {state.variant === "B" && selectedStorefront ? (
            <StorefrontInspector storefront={selectedStorefront} />
          ) : null}
        </div>
      ) : null}
      {state.variant !== "B" && selectedStorefront ? (
        <StorefrontDetailLine storefront={selectedStorefront} />
      ) : null}
    </main>
  );
}

function TelemetryStrip() {
  return (
    <section className="telemetry-strip" aria-label="Collector telemetry">
      <div>
        <span className="live-dot" />
        <strong>Collector running</strong>
        <small>heartbeat 8s ago</small>
      </div>
      <div>
        <strong>18.7</strong>
        <span>source requests/s</span>
      </div>
      <div>
        <strong>143.2</strong>
        <span>conclusive checks/s</span>
      </div>
      <div>
        <strong>91.4</strong>
        <span>out-of-stock checks/s</span>
      </div>
      <div>
        <strong>1,842 ↓</strong>
        <span>overdue · shrinking</span>
      </div>
      <div>
        <StatusBadge tone="recovering">IP constrained safely</StatusBadge>
      </div>
    </section>
  );
}

function StorefrontInspector({ storefront }: { storefront: Storefront }) {
  return (
    <aside className="linear-inspector" aria-label="Selected storefront">
      <div className="inspector-heading">Selected storefront</div>
      <h2>{storefront.name}</h2>
      <p>{storefront.siteUrl}</p>
      <StatusBadge tone={storefront.attention}>{storefront.remediation}</StatusBadge>
      <dl>
        <div>
          <dt>Connector</dt>
          <dd>{storefront.connector}</dd>
        </div>
        <div>
          <dt>Catalog access</dt>
          <dd>{storefront.catalogAccess}</dd>
        </div>
        <div>
          <dt>Stock access</dt>
          <dd>{storefront.stockAccess}</dd>
        </div>
        <div>
          <dt>Affected</dt>
          <dd>{storefront.affected}</dd>
        </div>
        <div>
          <dt>Next</dt>
          <dd>{storefront.next}</dd>
        </div>
      </dl>
      <p className="inspector-reason">{storefront.reason}</p>
    </aside>
  );
}

function StorefrontDetailLine({ storefront }: { storefront: Storefront }) {
  return (
    <section className="detail-line" aria-label="Selected storefront details">
      <div>
        <span>Selected</span>
        <strong>{storefront.name}</strong>
      </div>
      <div>
        <span>Why</span>
        <p>{storefront.reason}</p>
      </div>
      <div>
        <span>Affected</span>
        <strong>{storefront.affected}</strong>
      </div>
      <div>
        <span>Connector</span>
        <strong>{storefront.connector}</strong>
      </div>
    </section>
  );
}
