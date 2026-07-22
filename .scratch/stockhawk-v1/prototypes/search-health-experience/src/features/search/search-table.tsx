import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  functionalUpdate,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ExpandedState,
  type PaginationState,
  type SortingState,
  type Table,
} from "@tanstack/react-table";
import { ProductThumbnail } from "../../components/product-thumbnail";
import { StatusBadge } from "../../components/status-badge";
import { fetchOffers } from "../../data/mock-api";
import { stockhawkQueryKeys } from "../../data/stockhawk-query-keys";
import type { Offer, PrototypeVariant, UrlState } from "../../stockhawk.types";

interface SearchTableProps {
  state: UrlState;
  variant: PrototypeVariant;
  updateState: (changes: Partial<UrlState>) => void;
}

const columnHelper = createColumnHelper<Offer>();

function formatAge(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

function isStale(offer: Offer): boolean {
  const freshnessLimit = offer.stock === "in stock" ? 60 : 15;
  return offer.checkedMinutes > freshnessLimit;
}

function matchesChips(offer: Offer, chips: string[]): boolean {
  if (chips.length === 0) return true;
  const haystack = [
    offer.title,
    offer.canonicalTitle,
    offer.retailer,
    offer.siteUrl,
  ]
    .join(" ")
    .toLowerCase();

  return chips.some((chip) => haystack.includes(chip.toLowerCase()));
}

function filterOffers(offers: Offer[], state: UrlState): Offer[] {
  return offers.filter((offer) => {
    if (!state.includeHistorical && offer.presence === "inactive") return false;
    if (state.stock !== "all" && offer.stock !== state.stock) return false;
    if (state.match !== "all" && offer.match !== state.match) return false;
    return matchesChips(offer, state.chips);
  });
}

export function SearchTable({ state, variant, updateState }: SearchTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "checked", desc: false }]);
  const [expanded, setExpanded] = useState<ExpandedState>(true);
  const offersQuery = useQuery({
    queryKey: stockhawkQueryKeys.offers(),
    queryFn: fetchOffers,
  });
  const filteredOffers = useMemo(
    () => filterOffers(offersQuery.data ?? [], state),
    [
      offersQuery.data,
      state.chips,
      state.includeHistorical,
      state.match,
      state.stock,
    ],
  );
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "image",
        header: "Image",
        cell: ({ row }) => <ProductThumbnail offer={row.original} />,
      }),
      columnHelper.accessor("title", {
        header: "Product listing",
        cell: ({ row }) => (
          <div className="product-primary">
            <button
              type="button"
              className="text-button product-title"
              onClick={() => updateState({ selectedOfferId: row.original.id })}
            >
              {row.original.title}
            </button>
            <span>{row.original.canonicalTitle}</span>
          </div>
        ),
      }),
      columnHelper.accessor("retailer", {
        header: "Retailer",
        enableGrouping: true,
        cell: ({ row }) => (
          <div className="retailer-cell">
            <strong>{row.original.retailer}</strong>
            <span>{row.original.siteUrl}</span>
          </div>
        ),
      }),
      columnHelper.accessor("stock", {
        header: "Stock",
        cell: ({ getValue }) => <StatusBadge>{getValue()}</StatusBadge>,
      }),
      columnHelper.accessor("price", {
        header: "Price",
      }),
      columnHelper.accessor("checkedMinutes", {
        id: "checked",
        header: "Checked",
        cell: ({ row, getValue }) => (
          <span className={isStale(row.original) ? "freshness stale" : "freshness"}>
            {formatAge(getValue())} ago{isStale(row.original) ? " · stale" : ""}
          </span>
        ),
      }),
      columnHelper.accessor("match", {
        header: "Match",
        cell: ({ row, getValue }) => (
          <div className="match-cell">
            <StatusBadge tone={getValue()}>{getValue()}</StatusBadge>
            {row.original.coverage === "Partial" ? <span>Partial store</span> : null}
          </div>
        ),
      }),
      columnHelper.display({
        id: "open",
        header: "",
        cell: ({ row }) => (
          <a
            className="open-link"
            href={row.original.listingUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open ↗
          </a>
        ),
      }),
    ],
    [updateState],
  );
  const pageSize = variant === "A" ? 12 : 9;
  const pagination: PaginationState = {
    pageIndex: state.pageNumber - 1,
    pageSize,
  };
  const grouping = useMemo(
    () => (state.view === "store" ? ["retailer"] : []),
    [state.view],
  );
  const table = useReactTable({
    data: filteredOffers,
    columns,
    state: { sorting, pagination, grouping, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    onPaginationChange: (updater) => {
      const next = functionalUpdate(updater, pagination);
      updateState({ pageNumber: next.pageIndex + 1 });
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    paginateExpandedRows: false,
    autoResetPageIndex: false,
    autoResetExpanded: false,
  });
  const selectedOffer =
    filteredOffers.find((offer) => offer.id === state.selectedOfferId) ?? filteredOffers[0];

  if (offersQuery.isPending) return <div className="linear-state">Loading listings…</div>;
  if (offersQuery.isError) return <div className="linear-state error">Listings unavailable.</div>;

  return (
    <>
      <div className="result-summary">
        <span>
          <strong>{filteredOffers.length.toLocaleString()}</strong> matching listings
          {state.view === "store" ? " · grouped by retailer" : " · every variant stays separate"}
        </span>
        <span>Mock slice of 48,260 active listings</span>
      </div>
      <div className={variant === "B" ? "table-inspector-layout" : ""}>
        <div className={`table-scroll search-table variant-${variant}`}>
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
                          <strong>{String(row.getValue("retailer"))}</strong>
                          <small>{row.subRows.length} matching listings</small>
                        </button>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    className={row.original.id === selectedOffer?.id ? "selected-row" : ""}
                    key={row.id}
                    onClick={() => updateState({ selectedOfferId: row.original.id })}
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
          {table.getRowModel().rows.length === 0 ? (
            <div className="linear-state">No listings match these filters.</div>
          ) : null}
        </div>
        {variant === "B" && selectedOffer ? <OfferInspector offer={selectedOffer} /> : null}
      </div>
      <TablePager table={table} pageNumber={state.pageNumber} />
    </>
  );
}

function OfferInspector({ offer }: { offer: Offer }) {
  return (
    <aside className="linear-inspector" aria-label="Selected listing">
      <div className="inspector-heading">Selected listing</div>
      <ProductThumbnail offer={offer} large />
      <h2>{offer.title}</h2>
      <p>{offer.canonicalTitle}</p>
      <dl>
        <div>
          <dt>Retailer</dt>
          <dd>{offer.retailer}</dd>
        </div>
        <div>
          <dt>Stock</dt>
          <dd>{offer.stock}</dd>
        </div>
        <div>
          <dt>Coverage</dt>
          <dd>{offer.coverage}</dd>
        </div>
        <div>
          <dt>Checked</dt>
          <dd>{formatAge(offer.checkedMinutes)} ago</dd>
        </div>
        <div>
          <dt>Match</dt>
          <dd>{offer.match}</dd>
        </div>
        <div>
          <dt>Image</dt>
          <dd>{offer.imageSource}</dd>
        </div>
      </dl>
      <a className="primary-link" href={offer.listingUrl} target="_blank" rel="noreferrer">
        Open retailer ↗
      </a>
    </aside>
  );
}

interface TablePagerProps {
  table: Table<Offer>;
  pageNumber: number;
}

function TablePager({ table, pageNumber }: TablePagerProps) {
  const pageCount = table.getPageCount();

  return (
    <div className="table-pager">
      <span>
        Page {Math.min(pageNumber, pageCount)} of {pageCount}
      </span>
      <button type="button" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
        Previous
      </button>
      <button type="button" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
        Next
      </button>
    </div>
  );
}
