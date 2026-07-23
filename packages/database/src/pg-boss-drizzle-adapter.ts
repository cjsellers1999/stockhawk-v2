import { sql } from "drizzle-orm";
import type { Db, DrizzleTransactionLike, DrizzleSqlTagLike } from "pg-boss";

const placeholders = (text: string, values: unknown[]) => {
  const parts: string[] = [];
  const reordered: unknown[] = [];
  const pattern = /\$(\d+)/g;
  let priorEnd = 0;
  let match = pattern.exec(text);

  while (match !== null) {
    parts.push(text.slice(priorEnd, match.index));
    reordered.push(values[Number(match[1]) - 1]);
    priorEnd = pattern.lastIndex;
    match = pattern.exec(text);
  }
  parts.push(text.slice(priorEnd));
  return { parts, reordered };
};

const hasRows = (value: unknown): value is { rows: unknown[] } =>
  typeof value === "object" &&
  value !== null &&
  "rows" in value &&
  Array.isArray(value.rows);

const bindValue = (value: unknown) =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  !(value instanceof Date) &&
  !(value instanceof Uint8Array)
    ? JSON.stringify(value)
    : value;

/**
 * pg-boss 12.26.2's bundled adapter targets Drizzle 1 RC, whose execute
 * result wraps rows. StockHawk pins Drizzle 0.45.2, which returns rows
 * directly, so this narrow adapter preserves pg-boss's parameter binding
 * while normalizing that one compatibility difference.
 */
export const fromStockHawkDrizzle = (
  transaction: DrizzleTransactionLike,
): Db => ({
  executeSql: async (text, values = []) => {
    const { parts, reordered } = placeholders(text, values);
    const strings = Object.assign([...parts], {
      raw: [...parts],
    }) as TemplateStringsArray;
    const parameters = reordered.map((value) => sql.param(bindValue(value)));
    const result: unknown = await transaction.execute(
      (sql as DrizzleSqlTagLike)(strings, ...parameters),
    );

    if (hasRows(result)) {
      return result;
    }
    if (Array.isArray(result) && result.length > 0 && result.every(hasRows)) {
      return { rows: result.flatMap((item) => item.rows) };
    }
    if (Array.isArray(result)) {
      return { rows: result };
    }
    throw new Error("Unsupported Drizzle transaction result");
  },
});
