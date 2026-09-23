# RALOA API

The backend is a TypeScript modular monolith built around NestJS, Fastify, PostgreSQL and Prisma.
The first vertical slice is real and database-backed:

- opaque HttpOnly cookie sessions with Argon2id passwords;
- authenticated profile CRUD, duplication and ownership checks;
- pages and optimistic-version updates;
- registry-shaped blocks, ownership checks, updates and transactional reorder;
- persisted themes with optimistic-version checks;
- published public profile reads and analytics event ingestion;
- persisted form definitions and public submissions;
- double-opt-in subscriber records;
- event-derived analytics snapshots;
- reveal-once, hashed API keys;
- optional Redis session caching with PostgreSQL fallback for local development;
- `/health`, `/ready`, and generated OpenAPI at `/docs`.

## Local run

1. Start infrastructure with `npm run backend:up` when Docker is available. The Compose
   PostgreSQL service is exposed on host port `5433` to avoid collisions with a local PostgreSQL
   installation. A local PostgreSQL server also works; Redis is optional for the synchronous slice.
2. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` and a 32+ character
   `SESSION_SECRET`.
3. Run `npm run backend:prisma:migrate` and `npm run backend:prisma:seed`.
4. Start with `npm run backend:dev`.

The seeded development account is `demo@raloa.app` / `raloa-demo-password`. Do not use it outside
local development.

`backend:build` is a compile-only check. The remaining milestones add queues, media storage, email,
analytics workers, billing, domains, integrations, and the public developer API behind the same
module/repository boundaries.
