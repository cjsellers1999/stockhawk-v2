import type { Offer, OfferSearchQuery } from "@stockhawk/contracts";
import { FlexRender, useTable, type Row } from "@tanstack/react-table";
import { Fragment } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../../components/ui/table.js";
import badgeStyles from "../offer-badge.module.css";
import {
  offerTableColumns,
  offerTableFeatures,
} from "./offer-table-columns.js";
import styles from "./offer-table.module.css";

type OfferTableProps = {
  data: Offer[];
  failed: boolean;
  loading: boolean;
  view: OfferSearchQuery["view"];
};

const offerCountLabel = (count: number) =>
  `${count.toLocaleString("en-US")} ${count === 1 ? "offer" : "offers"}`;

const renderOfferRow = (row: Row<typeof offerTableFeatures, Offer>) => (
  <TableRow key={row.id}>
    {row.getAllCells().map((cell) => (
      <TableCell
        className={`${styles.bodyCell} whitespace-normal`}
        key={cell.id}
      >
        <FlexRender cell={cell} />
      </TableCell>
    ))}
  </TableRow>
);

export const OfferTable = ({
  data,
  failed,
  loading,
  view,
}: OfferTableProps) => {
  const table = useTable({
    columns: offerTableColumns,
    data,
    features: offerTableFeatures,
    getRowId: (offer) => offer.listingIdentity,
  });

  let emptyMessage = "No Offers match the current search.";
  if (loading) {
    emptyMessage = "Loading Offers…";
  } else if (failed) {
    emptyMessage = "Offers are temporarily unavailable.";
  }

  const rows = table.getRowModel().rows;
  const groupedRows = new Map<string, { label: string; rows: typeof rows }>();
  for (const row of rows) {
    const offer = row.original;
    const key = offer.storefrontIdentity;
    const group = groupedRows.get(key);
    if (group === undefined) {
      groupedRows.set(key, { label: offer.storefrontName, rows: [row] });
    } else {
      group.rows.push(row);
    }
  }

  return (
    <Table className="min-w-3xl border-collapse text-left">
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow className="hover:bg-transparent" key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                className={`${styles.headerCell} h-auto text-muted-foreground`}
                key={header.id}
              >
                {header.isPlaceholder ? null : (
                  <table.FlexRender header={header} />
                )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.length === 0 ? (
          <TableRow>
            <TableCell
              className="px-3 py-8 text-center whitespace-normal text-muted-foreground"
              colSpan={offerTableColumns.length}
            >
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : view === "flat" ? (
          rows.map(renderOfferRow)
        ) : (
          [...groupedRows.entries()].map(([key, group]) => (
            <Fragment key={key}>
              <TableRow className="bg-muted hover:bg-muted">
                <TableCell
                  className={styles.groupCell}
                  colSpan={offerTableColumns.length}
                >
                  {group.label}{" "}
                  <span
                    className={`${badgeStyles.badge} inline-flex items-center bg-secondary text-secondary-foreground`}
                  >
                    {offerCountLabel(group.rows.length)}
                  </span>
                </TableCell>
              </TableRow>
              {group.rows.map(renderOfferRow)}
            </Fragment>
          ))
        )}
      </TableBody>
    </Table>
  );
};
