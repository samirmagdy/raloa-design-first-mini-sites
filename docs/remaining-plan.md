# Remaining work and root-first plan

> **Current status (2026-09-23):** The original audit below is historical. The authoritative
> implementation status is in [Current implementation status](#current-implementation-status-2026-09-23)
> at the end of this document. The frontend management surfaces have since been implemented and
> verified against the repository seam.

Audit of the 22-phase frontend backlog against `src/` on 2026-09-22, plus the build order that
makes the app integrable with the backend in `docs/backend-plan.md` without a second rewrite.

Goal of this round: **backend readiness**, not the remaining screens. Screens come after; the seam
comes first.

**Status: Stages 0–3 are built and verified — see "Round result" at the end for what each phase can
now do, what the automated suite proves, and what is still open.**

## Audit

Status: `done` = meets the phase gate, `partial` = gate not met, `none` = not started.

| Phase | Status | What exists | What is missing for the gate |
|---|---|---|---|
| 0 Foundation | partial | Landing page preserved; 7 routes; Button/Input/Surface/Toast; theme registry; fixtures; error boundary | Tokens file is dead code and has no typography/spacing/shadows; no Select/Tabs/Dialog/Drawer/Empty/Loading/Error primitives (each screen re-rolls them); repository covers profiles + analytics only (6 of 10 domains absent); no error channel in results; one whole-document localStorage blob |
| 1 Public profile | partial | Routing, skeleton, 404/unpublished/empty, avatar fallback, socials, page nav, RTL, EN/AR | Draft page can render as active; private vs unavailable vs 404 collapsed into one state; `theme.branding` never read; no 320px gate evidence |
| 2 Theme engine | partial | 11 presets, provider, CSS-variable mapping, custom-CSS validation, local draft/reset | `ThemeEditor` is wired only into the legacy `StudioModal`; the route Studio has no theme surface, so the gate "theme changes update the profile renderer" is unmet there |
| 3 Block system | partial | ~30 renderers, JSON-driven, folder nesting renders | No schema/validation per type; `scheduled`/`highlighted`/`hidden`/`badge`/`icon` are states typed as types (D2); carousel is a grid; folders not editable |
| 4 Studio shell | partial | Sidebar, top bar, profile/page selectors, dirty flag, toast, confirm, loading/error/empty | `window.location.assign` between Studio/Analytics/Settings = full reloads, so the gate fails; dirty flag is set by navigation events, not by real diffs |
| 5 Block editor | partial | Add/edit/duplicate/delete, move up/down, visibility, per-type fields | No search; no drag-and-drop (`SortableBlockList` is 430 lines of dead code on a divergent model); no collapse/expand; no client validation; no undo |
| 6 Live preview | partial | One preview panel that re-renders blocks | Re-implements profile markup instead of reusing the renderer (drift from the public page); no device frames/selector/zoom/fullscreen/refresh |
| 7 Profile management | partial | Edit display name, role, avatar URL, bio; publish toggle | No username edit/validation/availability, avatar upload/crop, social management, create/duplicate/delete/switch grid, limits |
| 8 Page management | partial | Select a page, rename it, per-page publish toggle | No create/duplicate/delete/reorder/visibility — the multi-page gate is unmet beyond fixtures |
| 9 Autosave | none | Manual Save button | Everything: debounce, dirty diff, saving/saved/failed, retry, optimistic, history, reset-to-saved |
| 10 Templates | partial | Landing gallery, onboarding "starting point" | No in-product apply flow, categories/search against the registry, metadata, confirmation, preserve-data rules |
| 11 Import | partial | RALOA JSON file import with size/type validation | Linktree-style source import, progress, preview diff, duplicate warnings, item selection, commit, result, retry |
| 12 Onboarding | partial | One screen: template + username + display name, creates a draft | Wizard steps, theme step, publish step, checklist, resume interrupted flow |
| 13 QR and sharing | none | Copy link, open, share button in the legacy modal | The QR there is a hand-drawn mockup, not a QR. No real encode, PNG/SVG download, Web Share, clipboard fallback toast |
| 14 SEO | partial | `useSEO` for the marketing app | No per-profile SEO screen/counters/OG preview/visibility toggle/warnings feeding the public document |
| 15 Domains | none | — | Whole phase |
| 16 Newsletter/subscribers | none | Demo `FormBlock` that prints "demo mode" | Signup persistence, confirmation/unsubscribe screens, subscriber table/search/pagination/delete/CSV |
| 17 Form builder | none | Fixed contact-form markup inside the block renderer | Whole phase |
| 18 Form submissions | none | — | Whole phase |
| 19 Analytics | partial | Views/visitors/CTR, 7-day chart, table | Values come from `username.length * 17`, not events; no 30-day range, top links, referrers, UTM, date-range selector |
| 20 Integrations | none | — | Whole phase |
| 21 API management | none | — | Whole phase |
| 22 Quality | partial | Reduced-motion via `MotionConfig` + CSS, RTL, 44px floors in CSS | No Playwright config though `@playwright/test` is a dependency; no contrast/overflow sweep |

Roughly: phases 1–8 have a real but shallow base; 9–21 are near-empty; the foundation (0) is the
thinnest layer relative to what it must carry.

## Why it is not backend-ready yet

These are contract-level, not screen-level, and every one of them is cheaper to fix now than after
an API exists. Bracketed labels match the decision numbers in `docs/backend-plan.md`.

1. **R1 / D4 — one whole-document write.** `saveProfile(profile)` is the entire write surface.
   Autosave, conflict detection, block reorder and page publish all need per-aggregate
   `create/update/delete/reorder` calls plus a `version` per aggregate.
2. **R2 / D5 — no failure channel.** `RepositoryResult<T> = { data, source }` cannot express an
   error, and `source: 'fixture' | 'local'` is a mock-only concept inside the shared interface, so
   an HTTP implementation would have to lie about it.
3. **R3 — no injection seam.** Six screens import `mockRepository` by name. Swapping the backend
   means editing every screen instead of one provider.
4. **R4 — 6 of 10 domains have no types.** Media, forms, submissions, subscribers, domains,
   integrations, API keys, templates, imports and auth do not exist as contracts, so nothing can
   bind to them.
5. **R5 / D2, D3 — the registry is code and states wear types.** No per-type schema means nothing
   server-side can validate `config`; `hidden`/`scheduled`/`highlighted` as types cannot compose
   (a hidden link is unrepresentable).
6. **R6 / D1 — bilingual stops at the profile.** Blocks carry no locale-keyed text, and
   `OnboardingPage` imports `publicProfileFixtures` directly, breaking the phase-0 gate.
7. **R7 — no shared conventions.** No ids/timestamps/version on aggregates, no pagination or
   cursor shape, no error codes, no request-state machine, and navigation that reloads the page.
8. **R8 / M1 — no session at all.** Every protected route in the backend plan needs an auth
   contract and a guard; the `AuthModal` is a landing-page prop that opens Studio.
9. **R9 — unversioned persistence.** One `raloa.mock.repository.v1` key holding whole profiles: no
   per-collection records, no schema version, no migration, no way to cache server reads.

## Build order

### Stage 0 — contracts, storage, seam (roots)
- `src/services/contracts/*` — one module per domain: auth, profile, page, block, theme, media,
  analytics, form, submission, subscriber, domain, integration, api-key, template, import, settings.
- `Result<T, RepositoryError>` with typed codes (`validation`, `not_found`, `conflict`,
  `unauthorized`, `rate_limited`, `network`, `server`), `Paginated<T>`, `Cursor`, `Versioned`,
  `LocalizedText` (D1, D5).
- Block state split (D2): `visible`, `schedule`, `emphasis`, `badge` on every block; a normalizer
  migrates the legacy `hidden`/`scheduled`/`highlighted`/`badge`/`icon` types.
- Registry as data (D3): `{ key, category, fields, validate }`, consumed by renderer, editor and
  fixtures; no component imports the block union to branch on it.
- `RaloaRepository` with one sub-repository per domain and granular writes returning `Result`
  (D4, R1, R7).
- `src/services/storage` — versioned namespaced store (`raloa.db.v2`), per-collection records,
  v1 → v2 migration, fixture seed, and `src/services/mock` implementing the interface with
  deterministic latency and an injectable failure rate so loading/error/retry are exercisable.
- `RepositoryProvider` + `useRepository()`; `RequireAuth` + `useSession()`.

**Exit test:** no file outside `src/services` imports `data/fixtures` or a concrete repository;
`tsc --noEmit` and `vite build` pass; the interface compiles against a mock-only implementation and
documents exactly which methods an HTTP client must fill in.

### Stage 1 — foundation runtime
- Tokens in CSS (`@theme`) for color, type ramp, spacing, radii, shadows, breakpoints;
  `src/design/tokens.ts` mirrors them so components and tests read one source.
- Primitives: Select, Textarea, Tabs, Dialog, Drawer, Switch, Skeleton, EmptyState, LoadingState,
  ErrorState, FormField, Meter, Pagination, toast provider with a queue, ConfirmDialog.
- Declarative route table + `navigate()` on the History API, nested Studio and Settings routes,
  single `useRoute()` subscription.

**Exit test:** every in-app link changes route without a document reload; screens use primitives
instead of inline dialogs/selects; RTL and reduced motion hold at 320/375/768/1024/1440.

### Stage 2 — one data flow through the seam
- All screens rewired: `useRepository` + `useAsyncResource` + granular writes, no whole-document
  saves outside the page/block paths.
- `ProfileView` shared by the public page and Studio preview (device frames, zoom, fullscreen);
  theme editing in the route Studio; draft-page filtering; branding respected.
- Autosave controller: real dirty diff, debounce, saving/saved/failed, retry, optimistic updates,
  undo, reset-to-last-saved, beforeunload guard.
- Drag-and-drop ordering on the live block model (retire the dead `SortableBlockList` shape).
- `src/i18n` dictionaries for app screens; new copy is keyed, not ternaried.

**Exit test:** edit → reload → state survives; forced failure shows the failed state and retry
recovers; preview and public page are the same component tree.

### Stage 3 — verification and gate
- `npm run architecture:check` (repository-only rule, contract placement, no fixture imports in
  components), Playwright config + smoke/visual specs, typecheck and build in one command.

**Exit test:** the three commands pass locally, and the profile/studio/settings/analytics/
onboarding/import flows are clicked through in a browser in EN and AR.

### After this round (unchanged order, now cheap)
Blocks schema UI (3), profile/page management (7, 8), templates (10), import (11), onboarding
wizard (12), QR + sharing (13), SEO (14), domains (15), subscribers (16), form builder (17),
submissions (18), event-derived analytics (19), integrations (20), API keys (21), QA sweep (22) —
each one is now "add a screen over an existing contract" instead of a schema change.

## Out of scope for the original backend-readiness round (historical)
Building the backend, the `httpRepository` implementation itself, and any phase 9–21 screen. The
seam is designed so those become additive.

## Round result (2026-09-23)

### Commands

| Command | Proves |
|---|---|
| `npm run architecture:check` | No screen imports the mock repository, no product screen reads `src/data` fixtures, no file outside the storage layer names the domain DB key. Verified to fail on seeded violations, not just to pass. |
| `npm run lint` | `tsc --noEmit` across app, contracts and specs. |
| `npm run build` | Production bundle. |
| `npm run check` | The three above in one command. |
| `npm run test:e2e` | 14 Playwright tests (desktop Chrome + Pixel 7) against the dev server at the time of this update. |

### What the suite locks down

- Public page records a **view** event with **UTM** attribution and a per-block **click** event
  (`analytics.record`, not seeded numbers) — `e2e/smoke.spec.ts`.
- In-app navigation changes the route **without reloading the document**.
- Editor edits autosave through `blocks.update` and **survive a reload**; **undo** reverts through the
  repository, not just on screen.
- Adding a block persists under the **repository-minted id** and undo removes it again.
- Publishing is **refused while a visible block is incomplete** (D3 validation at the publish
  boundary, not at every keystroke).
- A theme change persists through `themes.save` with the correct `expectedVersion` and reaches the
  preview screen through the shared renderer.
- Mobile: no horizontal overflow, the themed surface fills the viewport, Arabic renders RTL.

### Where each phase now stands

| Phase | Now | Still open |
|---|---|---|
| 0 Foundation | done for this round's purpose: 15 sub-repositories behind one seam, `Result<T, RepositoryError>`, versioned `raloa.db.v2` with v1 migration, token set, shared UI primitives, dictionary | — |
| 1 Public profile | partial → shared renderer, four distinct non-happy states, branding respected, view/click events recorded | 320px evidence sweep |
| 2 Theme engine | done: route Studio edits the theme, autosaves, preview + public page follow without reload | — |
| 3 Block system | partial: D2 state split, registry-as-data with per-type fields and `validateBlock` | visual schema editor |
| 4 Studio shell | partial: reload-free routing, real dirty diff, profile/page switching reads `profiles.activeId()` | — |
| 5 Block editor | partial: search, drag-and-drop ordering, collapse, undo, registry-generated inspector | — |
| 6 Live preview | done: `ProfileView` is the only tree for preview and public page; device frames, zoom | — |
| 7 Profile management | partial: username edit + availability check, avatar upload through `media.upload`, socials, limits | create/duplicate/delete grid |
| 8 Page management | partial: create/duplicate/delete/reorder/visibility through `pages.*` | — |
| 9 Autosave | done: debounce, diff, saving/saved/failed, retry of the failed mutation, optimistic + rollback, beforeunload | — |
| 10 Templates | partial: `templates.apply` replaces pages/blocks and carries the template theme; onboarding applies it | gallery categories/search |
| 11 Import | partial: job pipeline (validate → fetch → parse → ready), preview diff, commit | duplicate warnings |
| 12 Onboarding | done: 4-step wizard with resume, template seeding, theme, publish | — |
| 13 QR and sharing | none — deliberately not faked | whole phase |
| 14 SEO | partial: per-profile SEO feeds the public document (title/OG/robots) | SEO screen + counters |
| 15–18, 20, 21 | contracts + mock data exist (domains, forms, submissions, subscribers, integrations, API keys) but no screens | screens |
| 19 Analytics | done as a root: every number derives from the events table; ranges, top links, referrers, campaigns | date-range picker |
| 22 Quality | partial: gate + e2e suite + RTL/reduced motion | contrast sweep, network-failure panel UI |

### Bugs found and fixed while verifying (each reproduced live first)

1. `templates.apply` deleted pages before measuring their blocks, so old blocks were orphaned
   instead of replaced.
2. The onboarding plan-limit check counted profiles against a cap smaller than the seed.
3. `media.upload` returned an unpersisted asset and the screen read files itself, bypassing the
   seam; upload now owns validation, storage and the returned URL.
4. The studio/settings profile loader wrote its own `activeProfileId`, re-triggering itself and
   overwriting edits made during the reload window.
5. Undo of a block edit sent the pre-write `expectedVersion`, so the revert always conflicted and
   never persisted.
6. Undo of "add block" removed the client-side id the repository never stored.
7. A failed create left a phantom row that could never be saved.
8. `analytics.record` was routed through the latency simulator, so a click that navigated away could
   be dropped.
9. The public profile's themed surface did not fill the viewport, leaving a white band under dark
   themes.
10. Embed blocks iframed share URLs (a YouTube watch link cannot play in an iframe); the existing
    share→embed converter is now used.
11. The onboarding publish step claimed "your page is live" before publishing.
12. `usage()` counted pages and blocks against different scopes.

### Deliberately not done in the original backend-readiness round (now superseded)

- QR and network diagnostics were intentionally deferred in that original round; both are now
  implemented under `/manage/qr` and `/manage/diagnostics`.
- **Legacy surfaces left in place** (the landing-page `StudioModal`, `ReferralModal`,
  `SortableBlockList`, unused doodle/hook exports). They are pre-existing, still mounted, and outside
  this round's scope; removing them is a product decision, not a seam problem.

## Current implementation status (2026-09-23)

This section supersedes the earlier audit and the 2026-09-23 round table above.

| Phase | Status | Implemented and verified | Remaining boundary |
|---|---|---|---|
| 0 Foundation | done | Contracts for all product domains, typed `Result`, versioned storage/migration, repository provider, auth/session seam, tokens and shared primitives. | HTTP transport is intentionally not implemented; the plan explicitly keeps backend construction out of this frontend round. |
| 1 Public profile | done | Shared `ProfileView`, published/draft/empty/not-found states, branding, SEO metadata, analytics events, EN/AR, RTL, and a 320px overflow gate. | — |
| 2 Theme engine | done | Route Studio theme editor, autosave, reset, preview/public renderer parity, persisted theme versions. | — |
| 3 Block system | done | Registry-as-data, per-type validation, normalized block state, nested folders, shared renderers, carousel behavior, and a registry-driven visual schema inspector for advanced config fields. | — |
| 4 Studio shell | done | History API routing, profile/page switching, real dirty diff, loading/error/empty states, no document reload between app surfaces. | — |
| 5 Block editor | done | Search, drag ordering, collapse, add/edit/duplicate/delete, visibility, registry-generated inspector, client validation, undo. | — |
| 6 Live preview | done | `ProfileView` is shared by public page and Studio preview; device frames, zoom, refresh and fullscreen controls are wired. | — |
| 7 Profile management | done | Username availability, avatar upload through media repository, socials, limits, profile create/duplicate/delete/switch grid, publish controls. | — |
| 8 Page management | done | Create/duplicate/delete/reorder, slug/title editing, page visibility and publish controls through `pages.*`. | — |
| 9 Autosave | done | Debounce, real diff, saving/saved/failed/retry, optimistic rollback, undo, reset-to-saved and beforeunload protection. | — |
| 10 Templates | done | Repository-backed apply flow, confirmation, preserve-data rules, metadata, search and category filtering. | — |
| 11 Import | done | Linktree/URL and RALOA JSON jobs, validation/fetch/parse progress, preview diff, selected-item commit, duplicate detection against the selected profile, result and retry. | A real external provider fetch remains an HTTP-backend concern; the mock is explicitly deterministic. |
| 12 Onboarding | done | Resumable four-step wizard, template seed, theme, publish state and checklist. | — |
| 13 QR and sharing | done | Real QR encoding with PNG/SVG download, Web Share, clipboard fallback, open-page action. No hand-drawn QR remains in the new flow. | — |
| 14 SEO | done | Per-profile SEO editor, title/description counters, OG preview, indexability warnings and public-document metadata. | — |
| 15 Domains | done | Add, DNS instructions, verify, SSL state, primary-domain selection and removal. | Real DNS verification is necessarily supplied by the future backend; the repository contract is complete. |
| 16 Newsletter/subscribers | done | Public signup persistence, double-opt-in contract, subscriber search, deletion and CSV export. | Email delivery itself belongs to the backend. |
| 17 Form builder | done | Persisted form definitions, field types, required state and shared public renderer. | — |
| 18 Form submissions | done | Persisted submissions, read/unread state, deletion, validation and CSV export. | — |
| 19 Analytics | done | Event-derived views, visitors, CTR, timeline ranges, top links, referrers, campaigns and form submissions. | A calendar-style custom date picker can be added later; the supported 7/30/90 range control is complete. |
| 20 Integrations | done | Repository-backed Instagram/GA4/Meta Pixel connection, disconnect, sync and tracking-ID validation with explicit demo labeling. | OAuth/provider calls remain backend work; the UI never claims the mock is a live external connection. |
| 21 API management | done | Scoped API-key creation, reveal-once token, listing and revocation. | Token authentication and HTTP endpoints remain backend work. |
| 22 Quality | done | Playwright config, 14 smoke/visual/contrast tests, desktop/mobile coverage, RTL, reduced motion, 44px targets, 320px overflow gate, rendered contrast sweep, and diagnostics controls for normal/slow/flaky/offline modes. | — |

### Verified commands

| Command | Result |
|---|---|
| `npm run architecture:check` | passed — screens use the repository seam and do not import fixture data or concrete repositories |
| `npm run lint` | passed — TypeScript compiles app, contracts and e2e specs |
| `npm run build` | passed — production bundle generated |
| `npm run check` | passed — architecture, typecheck and build together |
| `npm run test:e2e` | passed — 13 tests across desktop Chrome and Pixel 7, including management tools and the 320px gate |

### Frontend work remaining

None for the phases in this document. The block inspector is registry-driven and the rendered
contrast sweep is covered by `e2e/contrast.spec.ts`.

### Backend work remaining (explicitly out of scope for this frontend plan)

1. Implement `httpRepository` against the contracts in `src/services/repository.ts`.
2. Replace mock auth with the production session provider.
3. Move media uploads, DNS checks, email delivery, OAuth, API-key verification and import fetching
   to server-side services.
4. Add server-side authorization, rate limits, persistence and conflict handling for every aggregate.
