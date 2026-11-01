# ProjectForge

**ProjectForge** is a visual engineering workspace for designing software projects before implementation.

The product will be developed in deliberate stages. The first release is focused exclusively on SQL database design.

## Product roadmap

### Phase 1 — Simple SQL Designer (current MVP)
- Create and manage database projects.
- Add tables and columns.
- Configure column data types, nullability, primary keys, unique constraints, and defaults.
- Define foreign-key relationships between tables.
- Inspect a visual entity-relationship diagram.
- Generate and copy SQL DDL.
- Save and reopen projects locally.

Initial SQL dialect target: PostgreSQL, with the model designed to support additional dialects later.

### Phase 2 — Intermediate SQL Studio
- Multiple SQL dialects.
- Indexes, check constraints, composite keys.
- SQL import and schema reverse engineering.
- Schema validation and relationship analysis.
- Migration and schema diff tools.

### Phase 3 — Advanced Database Engineering
- Query builder and query workspace.
- Views, functions, triggers and procedures.
- Migration history and dependency graph.
- Collaboration, versioning and advanced exports.
- Optional AI assistance (not part of the initial releases).

## Technology direction

- Next.js / React / TypeScript
- React Flow for visual schema editing
- Zustand for client state
- Zod for schema validation
- IndexedDB for local-first persistence in the MVP
- PostgreSQL and a backend service can be introduced when accounts and cloud sync are needed

## Development principles

1. Ship a focused, reliable SQL tool before expanding scope.
2. Keep the database schema model independent from UI components.
3. Validate data before saving or generating SQL.
4. Never silently discard user changes.
5. Keep the MVP usable without accounts, AI APIs, or a remote database.

## Status

Phase 1 — planning and foundation.
