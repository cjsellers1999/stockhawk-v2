# Database Table Design Resources

## Knowledge

- [StockHawk Drizzle schema](packages/database/src/schema.ts)
  Primary source for the current tables, columns, constraints, indexes, and `search_document_source` view. Use for: every StockHawk-specific lesson.
- [PostgreSQL: Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
  Official explanation of primary keys, foreign keys, unique constraints, checks, and referential actions. Use for: deciding which invalid states the database should reject.
- [PostgreSQL: Indexes](https://www.postgresql.org/docs/current/indexes.html)
  Official overview of why indexes speed reads but add write/storage costs. Use for: deciding which access paths deserve indexes.
- [PostgreSQL: Partial Indexes](https://www.postgresql.org/docs/current/indexes-partial.html)
  Official explanation of indexes covering only rows matching a condition. Use for: understanding StockHawk's one-active-match rule and active Offer search index.
- [Drizzle ORM: Indexes and Constraints](https://orm.drizzle.team/docs/indexes-constraints)
  Official mapping between Drizzle schema declarations and SQL constraints/indexes. Use for: translating a design into this repository's TypeScript schema.
- [Drizzle ORM: Views](https://orm.drizzle.team/docs/views)
  Official guide to declaring database views. Use for: understanding `search_document_source`.

## Wisdom (Communities)

- [PostgreSQL mailing lists](https://www.postgresql.org/list/)
  Long-running project communities with searchable archives. Use for: validating difficult PostgreSQL modeling and correctness questions.
