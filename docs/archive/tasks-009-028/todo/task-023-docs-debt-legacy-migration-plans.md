# IDEA: Separate Legacy Migration Research From Shipped Docs

## Why

The repository still contains older Astro/Strapi/Supabase migration documents that read like active architecture guidance even though the shipped app is currently Vite + vanilla TypeScript + Vercel serverless + Airtable adapters for planner/editor routes.

## Follow-up

- Audit `docs/` and `src/analysis/` for documents that still describe an active migration plan rather than historical exploration.
- Move exploratory material into a clearly marked archive or research section.
- Add a short landing note in `docs/` that points readers to the canonical shipped references first:
  - `DWF/CORE_ARCHITECTURE.md`
  - `DWF/DATA_MODEL.md`
  - `docs/planner-api-implementation-boundaries.md`
  - `docs/backend-*.md`

## Acceptance Signal

- New contributors can distinguish shipped behavior from exploratory migration ideas without reading the full repo history.
