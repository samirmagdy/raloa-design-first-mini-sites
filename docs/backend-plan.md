# RALOA Backend Plan

Status: proposal, not started. Scope: the backend requirements backlog (modular monolith, NestJS + Fastify, ~400 numbered items across 41 sections) consolidated into an executable plan.

This plan is grounded in the current frontend contracts rather than written generically. Where it contradicts the source requirements document, the reason is stated inline.

## Stack

Adopt the requirements document's stack table as written: NestJS + Fastify adapter, TypeScript, PostgreSQL, Prisma, Redis, BullMQ, Cloudflare R2, Stripe, Resend, Cloudflare, Docker, Fly.io/Railway, Sentry + Pino, GitHub Actions. Re-litigating vendor choice is wasted motion. Three amendments:

1. **Zod, not class-validator.** The frontend already speaks object shapes (`src/services/repository.ts`), and one schema language should generate the OpenAPI document *and* validate block `config` JSONB. class-validator handles the second poorly.
2. **Prisma behind a thin repository layer; no raw Prisma in services.** `RaloaRepository` already exists as the frontend seam. Keeping the same discipline server-side is what makes the frontend swap mechanical instead of a rewrite.
3. **Cloudflare for SaaS (custom hostnames) belongs in the stack table, not in the custom-domain phase.** It is the only realistic way to serve per-creator domains with managed TLS on Fly/Railway, and it changes the DNS and certificate model from day one. Leaving it as a detail inside that phase will stall it.

Re-verify at build time rather than trusting this document: the claims "PostgreSQL 18.6 released August 13 2026" and "Prisma 8 GA expected October 2026" are dated statements in an undated plan.

## Decisions that gate everything

These six must be settled before milestone M1 writes code. Each is expensive to reverse once real creators have data, and the requirements document is either silent on them or wrong for this codebase.

### D1 — Per-locale block content

`PublicProfile` carries paired language columns (`src/services/repository.ts:103-106`: `role`/`roleAr`, `bio`/`bioAr`), but `ProfileBlock` has only `title?`, `subtitle?`, `content?` (`:58-61`) — no Arabic variants at all. The bilingual promise therefore holds at profile level and breaks at block level.

**Settle:** locale-keyed content inside block config — `{ title: { en, ar }, subtitle: { en, ar } }` — rather than extending the `Ar` column-suffix habit. Suffixes do not scale to a third language, and the codebase already carries enough field-level variants to reconcile.

### D2 — Type versus state

`BlockType` (`src/services/repository.ts:6-44`) declares 37 members, of which at least four are states wearing a type:

- `hidden` — `BlockRenderer.tsx:134` returns null when `block.type === 'hidden' || !block.visible`, i.e. the same condition expressed twice.
- `highlighted` — `BlockRenderer.tsx:167` renders by re-invoking itself with `type: 'link'` plus a gradient wrapper. It is a presentation flag.
- `scheduled` — `BlockRenderer.tsx:161` renders a date wrapper. It is a time window.
- `badge` / `icon` — arguably presentational variants of `link`.

**Settle:** split into **type** (what the block is) and **state** (`visible`, `starts_at`/`ends_at`, `emphasis`). This is a prerequisite for the scheduling and password-gate requirements, which both assume `enabled` and date columns already exist. Without it you get rows like `type='hidden'` that cannot also be a hidden link.

### D3 — The block registry is data, not code

`BlockRenderer.tsx:145` collapses six separate union members (`spotify`, `apple-music`, `soundcloud`, `youtube`, `vimeo`, `tiktok`) into one `EmbedBlock`. Meanwhile the union has drifted from reality: 37 declared types, roughly 30 with explicit handling.

**Settle:** a registry entry per type — `{ key, schema (Zod), rendererKey, embedProvider? }`. The server validates `config` against the registry; the frontend maps `rendererKey` to a component. This stops the union and the renderers diverging, which is already happening.

### D4 — Save granularity

The entire write interface is `saveProfile(profile: PublicProfile)` (`src/services/repository.ts:125`) — one whole-document write for any edit, with no version field.

**Settle:** the autosave requirement (debounce → `PATCH` → version check → conflict detection → transaction) is **unimplementable** against this contract. Decide the granularity now: `PATCH /profiles/:id`, `PUT /pages/:id/blocks/order`, `PATCH /blocks/:id`, plus a `version` column on each aggregate. This is the single largest contract change in the migration and the one most likely to be discovered late.

### D5 — The result envelope has no error channel

`RepositoryResult<T> = { data: T; source: 'fixture' | 'local' }` (`src/services/repository.ts:1-4`). There is no way to express failure, and `source` is a frontend-only concept with no HTTP meaning.

**Settle:** define the server response envelope and a matching `Result<T, E>` on the client in M0 — not at integration time. `source` should become a property of the mock implementation only, not of the shared interface.

### D6 — Password gates are client-side today

`BlockRenderer.tsx:168` renders `<PasswordGate>` from the same bundle that already contains the protected content. The requirements document's rule ("never send protected data to the browser before password verification") is correct, and this is not a port — it is a rewrite of how gated content is fetched.

**Settle:** treat gated content as a security workstream with its own read path, not as a block feature.

## Milestones

The source document's 33 sequential phases consolidate into 7 milestones. Bracketed references are its section numbers.

### M0 — Contracts and skeleton (§1, §37, plus D5)

NestJS + Fastify; the four route prefixes (`/api/v1`, `/public/v1`, `/developer/v1`, `/webhooks`); typed env validation; global validation pipe and error filter; request correlation IDs; Pino structured logging; OpenAPI generation; `/health` and `/ready`; graceful shutdown; CORS allowlist; security headers; cursor pagination and query-filtering conventions. Docker Compose with Postgres and Redis.

Also in M0: generate a typed client from the OpenAPI spec and point a new `httpRepository` at it alongside the existing `mockRepository`. This makes the API contract a build artifact instead of a shared hope.

**Exit test:** `GET /health` returns 200 in Docker; the OpenAPI document renders; a deliberately invalid POST returns the standard error envelope; CI runs lint, typecheck, tests and `prisma migrate diff`.

### M1 — Identity and ownership (§2, §3, §4, §5 ownership-only)

Postgres + Prisma + migrations + seed; User entity; Argon2id hashing; opaque session ID in Redis behind an HttpOnly Secure SameSite cookie; login, logout, logout-all, `/auth/me`; authentication guard; brute-force limits; email verification; password reset; change email and password; account deletion and data export; login event logging.

**Ownership only:** `ownerUserId` on every aggregate plus one `OwnershipGuard` plus IDOR tests.

**Exit test:** "User A cannot read, modify, or delete Profile B" passes, and `logout-all` kills a live cookie immediately.

*Deferred deliberately:* RBAC roles, per-resource guards beyond ownership, tenant context, multi-workspace membership. There is no team feature in the product yet. Keep the schema room — `ownerUserId`, not `userId` — and build nothing else.

### M2 — Core product vertical slice (§6, §7, §8, §9, §10, §11)

Profiles (username slug, validation, reserved names, availability endpoint); pages (slug unique within profile, ordering, draft/published, SEO fields); blocks (registry-validated JSONB, `parent_id` + `position` for the nesting that `ProfileBlock.children` already assumes, bulk reorder in a transaction); theme (`ThemeConfig` persisted as-is, with `customCss` sanitised server-side — the client-side regex in `ThemeProvider.tsx:22` moves to the server and stays there); then the public read path: published-only, server-side visibility predicate, snapshot → Redis → ETag/CDN, public 404 handling. Autosave endpoints per D4.

**Exit test:** one real creator signs up, builds a page in Studio, publishes, and `raloa.app/@name` serves from cache — with `mockRepository` already swapped for `httpRepository` on profiles, pages and blocks.

*Note:* this pulls frontend integration forward from the end of the source plan into M2, because the source document's own argument ("wire one vertical slice at a time; that catches API-contract mistakes much earlier") demands it.

### M3 — Async and assets (§12, §16, §17, §32)

Redis with the exact responsibility list from §16 (sessions, rate limits, public cache, distributed locks, BullMQ, OAuth state, short-lived tokens — nothing permanent). Presigned R2 uploads with MIME, size and extension validation; orphan cleanup; quotas; storage provider abstraction. Separate worker process. Email provider abstraction plus the eight transactional emails.

**Exit test:** a 50 MB upload never touches the API process; a verification email arrives through a queue rather than the request path; killing the API mid-request loses no job.

### M4 — Monetization (§25, §26, §27)

Entitlements first — `entitlements.can(user, 'customDomain')`, usage counters, feature guards — then Stripe: customer, Checkout, Portal, webhook signature verification and idempotency, subscription lifecycle events, plan synchronisation, renewal date, grace state, cancel-at-period-end, subscription audit log. GA4 and Meta Pixel ID storage with entitlement gating.

**Exit test:** "frontend cannot fake a Studio entitlement" passes, and a replayed webhook is a no-op. The source document's instinct to place billing after the core product is correct and is preserved here.

### M5 — Growth features (§13, §14, §15, §23, §24)

Contact forms with server-side field validation, spam protection, submission inbox and CSV export. Subscribers with double opt-in and one-click unsubscribe. Analytics: ingestion endpoint → queue → worker → daily aggregation, returning exactly the `AnalyticsSnapshot` shape the client already expects (`views`, `uniqueVisitors`, `linkClicks`, `timeline[]` at `repository.ts:115-120`) — that is a free contract, use it verbatim. SEO metadata, dynamic OG images, `robots.txt`, sitemap. QR generation stays client-side.

**Addition the source document omits:** declare the events table's partitioning and retention policy here. The document names a retention policy but no storage strategy, and at any real traffic the events table will dominate the database.

### M6 — Hard, slow, external (§18, §19, §20, §21, §22, §28, §29, §30, §31, §33, §34, §35)

Scheduling and password gates are security work per D6, not features. Then custom domains, the import subsystem (the SSRF checklist in §21 is good — keep it verbatim), Instagram, API keys, developer API, distributed rate limiting, security hardening, audit logging, observability, backups and PITR, load testing.

**Two items are schedule risks, not backlog lines:**

- **Meta Graph API app review** can take weeks and has human approval dependencies outside engineering control. Start the application in M0 and let it run in parallel, or it becomes the critical path for the whole milestone.
- **Custom domains** cannot be estimated until the Cloudflare-for-SaaS decision from the stack section is made.

## Cut from v1

- **Public developer API and API keys.** Nothing in the product sells API access yet, and the source document's own entitlement example sets `apiAccess: false`. Building an authentication-and-scoping subsystem for zero current consumers is the most expensive item on the list. Move to a post-launch file.
- **Nested blocks and folder hierarchy as separate work.** `ProfileBlock.children` already implies them, so they land inside M2's block table or nowhere.

## Sequencing correction

The source document's "security before CRUD" principle is right in spirit and wrong in shape. Ownership is cheap and belongs in M1. Roles, per-resource guards, tenant context, IDOR suites and hardening are separate and much larger costs — the first belongs early, the rest belongs in M6 where the document has already buried them. Split that section across M1 and M6 rather than completing it before a profile exists.

## Open questions

1. Does a block need per-locale content for *every* field, or only user-facing text fields? (Affects D1 and the registry schema in D3.)
2. Is `visible` the intended single source of truth for show/hide, with `type: 'hidden'` a legacy artefact to migrate away from? (Affects D2 and any fixture data.)
3. Which of the 37 declared block types are actually shipping to creators, versus aspirational? The registry in D3 should only contain types with a renderer.
