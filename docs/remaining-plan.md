# Remaining work and root-first plan

Audit of the 22-phase frontend backlog against `src/` on 2026-09-22, plus the build order that
makes the app integrable with the backend in `docs/backend-plan.md` without a second rewrite.

Goal of this round: **backend readiness**, not the remaining screens. Screens come after; the seam
comes first.

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

## Out of scope this round
Building the backend, the `httpRepository` implementation itself, and any phase 9–21 screen. The
seam is designed so those become additive.
