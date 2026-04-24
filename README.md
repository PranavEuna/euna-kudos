# Euna Kudos

Internal recognition board for Euna Solutions. Post public kudos to thank, celebrate, or recognize a teammate; admins can feature the standout ones.

Built from the [vibe-coded-app-kit](./.claude/commands/create-euna-app.md) template — single repo, Hono + Drizzle backend, React 19 + TanStack frontend, one Lambda in prod, Aurora Serverless v2 for persistence.

---

## What's in it

- **Feed** — most-recent-first kudos with per-category filter chips, a "Most recognized" leaderboard, comment counts, relative timestamps, and an amber glow on featured posts.
- **Give Kudos** — recipient picker with avatars, category chips, live preview of how the post will look on the feed, character counter.
- **Kudos detail** — hero card showing both avatars, threaded comments with avatars, add-comment form with validation.
- **Admin** — feature/unfeature toggle with optimistic UI and rollback, total + featured counts, gated behind the `app-admins` group (in local dev, any email containing `admin`).
- **Auth** — Cloudflare Access JWT in production, email stub in local dev, restricted to `@eunasolutions.com`.
- **UX** — dark mode toggle (light/dark/system, persisted), toast notifications, skeleton loaders, empty states, keyboard shortcuts (`g` → feed, `n` → new kudos), mobile hamburger menu.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19, Vite 8, TanStack Router (file-based) + Query, react-hook-form + Zod, shadcn/ui, Tailwind v4, Sonner, Lucide |
| Backend | Hono 4, Drizzle ORM, postgres.js, Zod |
| DB (local) | embedded-postgres 17 (no Docker required) |
| DB (cloud) | Amazon Aurora Serverless v2, PostgreSQL 17.x |
| Auth (cloud) | Cloudflare Access + Active Directory upstream — app only reads the JWT |
| Hosting | AWS Amplify (static frontend) + API Gateway → single Lambda (Hono via `hono/aws-lambda`) |
| IaC | Terraform (shared `vibe_app` module) + AWS SAM for the Lambda |

---

## Quick start

**Prerequisites:** Node 20+, git. No Docker.

```bash
# Backend — starts embedded Postgres, runs migrations, boots Hono on :3000
cd backend
npm install
npm run dev
```

```bash
# Frontend — Vite on :5173 with proxy to :3000
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The DevLogin screen asks for an `@eunasolutions.com` email.

### Seeded demo data

The DB starts empty. To populate it with 15 realistic users, 24 kudos across every category, and 38 threaded comments:

```bash
cd backend
npm run db:seed
```

The script wipes existing `users`, `kudos`, and `comments` (FK-safe order) before inserting, so re-running it is idempotent. It reads `DATABASE_URL` from env, so the same command will populate Aurora once deployed:

```bash
DATABASE_URL="postgres://…aurora…" npm run db:seed
```

### Handy backend scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Postgres + run migrations + Hono dev server (hot reload) |
| `npm run db:start` / `db:stop` | Start/stop embedded Postgres only |
| `npm run db:generate` | Generate a migration from `src/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Drizzle Studio (visual schema + data) |
| `npm run db:reset` | Drop and recreate the local cluster |
| `npm run db:seed` | Wipe + reseed users/kudos/comments |
| `npm run db:psql` | Raw `psql` session against the embedded cluster |
| `npm run build` | Bundle `src/lambda.ts` with esbuild for Lambda |

---

## Auth model

This app uses **Model B** from the create-euna-app skill: any authenticated Euna employee can read the feed, post kudos, and comment. App-level role `app-admins` (from the JWT `groups` claim) can feature / unfeature kudos.

- **Cloud:** Cloudflare Access validates the user upstream, passes a signed JWT in `Cf-Access-Jwt-Assertion`. The middleware verifies signature + audience + issuer + domain (`@eunasolutions.com`) and JIT-provisions a row in `users` on first sight.
- **Local dev:** frontend attaches `X-Dev-User-Email: you@eunasolutions.com` to every request. The middleware applies the same domain check and JIT-provisioning path. Any email containing `admin` gets the `app-admins` group in dev so you can exercise the admin UI.

Defence-in-depth guardrails (do **not** remove):
- Backend middleware refuses to run when `AUTH_MODE=local_mock` and `NODE_ENV=production`.
- `X-Dev-User-Email` is rejected in production regardless.
- Vite strips dev-auth branches from production builds via `import.meta.env.DEV`.
- Non-`@eunasolutions.com` emails return `403 forbidden_domain` before any DB work.

---

## Project layout

```
euna-kudos/
├── backend/
│   ├── drizzle/              # committed migration SQL
│   ├── scripts/              # db start/stop/reset/seed wrappers
│   └── src/
│       ├── app.ts            # Hono app + route registration
│       ├── server.ts         # local entry (@hono/node-server)
│       ├── lambda.ts         # prod entry (hono/aws-lambda)
│       ├── seed.ts           # wipe + reseed script
│       ├── db/               # Drizzle client + schema
│       ├── middleware/       # auth (JWT + dev stub + domain check)
│       ├── lib/              # admin group check
│       └── routes/           # kudos, comments, users, stats
└── frontend/
    └── src/
        ├── main.tsx          # Providers: ThemeProvider, QueryClient, Toaster
        ├── App.tsx           # RouterProvider wiring
        ├── routeTree.gen.ts  # generated by TanStackRouterVite
        ├── routes/           # __root, index, new, kudos.$id, admin
        ├── pages/            # FeedPage, NewKudosPage, KudosDetailPage, AdminPage
        ├── components/       # DevLogin, EunaLogo, UserAvatar, CategoryChip, ui/*
        ├── lib/              # api, auth, theme, format, kudos, shortcuts
        └── index.css         # Tailwind v4 + Euna brand tokens
```

---

## Styling

The brand palette is pulled from `eunasolutions.com` production CSS and lives as CSS custom properties in [frontend/src/index.css](frontend/src/index.css):

| Token | Value | Role |
|---|---|---|
| `--euna-purple` | `#6145f7` | Primary |
| `--euna-indigo` | `#281978` | Deep accent |
| `--euna-navy`   | `#0d1f8f` | Gradient stop |
| `--euna-orange` | `#e7690d` | Warm accent |

Typography is Inter (Google Fonts) with `JetBrains Mono` for inline code. Dark mode is retuned so purple still pops against a deep indigo-black background.

---

## Deployment

Don't run `aws`, `terraform`, or `sam` by hand — use the `/deploy-euna-app` skill in Claude Code. It reads the [deploy skill](./.claude/commands/deploy-euna-app.md) and walks through:

1. Terraform apply of the shared `vibe_app` module (Aurora cluster, Lambda, API Gateway, Amplify app, Cloudflare Access policy, Secrets Manager paths).
2. `npm run build` to produce `backend/dist/lambda.mjs`.
3. SAM deploy of the Lambda (app Lambda + Migrator Lambda).
4. Amplify auto-deploys the frontend from the linked GitHub branch (`dev` → staging, `main` → production).
5. Optional `DATABASE_URL=... npm run db:seed` to pre-populate the cluster.

The deploy pipeline runs the Migrator Lambda synchronously before cutting traffic to the new app Lambda — no ad-hoc `ALTER TABLE` in app code.

---

## Design reference

- [Spec](./doc/spec.md) — canonical product scope
- [create-euna-app skill](./.claude/commands/create-euna-app.md) — stack, patterns, security checklist
- [deploy-euna-app skill](./.claude/commands/deploy-euna-app.md) — deploy flow and IaC contract
