# PropertyOps Hub

Property and facility operations platform. See `CLAUDE.md` for project rules and
`docs/PROP-0-PORTABILITY-REPORT.md` for the discovery/architecture audit this build
is based on.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL
```

Email (Resend) and file storage (Vercel Blob) are optional in local development —
the app runs fine with those env vars unset. Email sending stays off until
`EMAIL_ENABLED=true` is set explicitly; file upload/download routes report
"not configured" until `BLOB_READ_WRITE_TOKEN` is set.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — generate route types and run `tsc --noEmit`
- `npm test` — run the Vitest suite
- `npm run db:generate` — generate a Drizzle migration from `src/db/schema.ts`
- `npm run db:migrate` — apply pending migrations to `DATABASE_URL`
- `npm run db:seed` — create the default organization, admin role, and an admin
  user from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
