import type { Offer } from "@stockhawk/contracts";
import { useTable } from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../../components/ui/table.js";
import {
  offerTableColumns,
  offerTableFeatures,
} from "./offer-table-columns.js";

type OfferTableProps = {
  data: Offer[];
  failed: boolean;
  loading: boolean;
};

export const OfferTable = ({ data, failed, loading }: OfferTableProps) => {
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

  return (
    <Table className="min-w-3xl border-collapse text-left">
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow className="hover:bg-transparent" key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                className="h-auto px-3 py-2.5 text-xs font-semibold text-muted-foreground"
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
        ) : (
          table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getAllCells().map((cell) => (
                <TableCell
                  className="px-3 py-2.5 whitespace-normal"
                  key={cell.id}
                >
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
