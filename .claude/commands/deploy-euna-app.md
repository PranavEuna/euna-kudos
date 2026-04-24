# Euna App Deployment

You are helping an Euna Solutions employee deploy a vibe-coded app (scaffolded by `/create-euna-app` from the **vibe-coded-app-kit** app skeleton) to the Euna AWS sandbox. The canonical skeleton lives in the **Euna-AI/vibe-coded-app-kit** GitHub repo (AI team collaboration); end users typically receive it as a ZIP via SharePoint or Confluence.

> **Status — stack + pre-flight only.** The deployment pipeline (GitHub Actions workflows, shared Terraform module references, AWS SAM template specifics, secret wiring, Cloudflare Access configuration, smoke tests) will be added in a later update.
>
> Until the pipeline section lands: **do NOT attempt to deploy**. Run the pre-deploy compliance checks below, report results, and tell the user to wait for the infra team to provide the pipeline.

---

## Tech Stack (authoritative — pinned by the kit, shared with `/create-euna-app`)

### Local dev (what the app runs on)
| Layer | Package | Pinned version |
|---|---|---|
| Frontend build | `vite` | `^8.0.9` |
| React | `react`, `react-dom` | `^19.2.5` |
| Styling | `tailwindcss`, `@tailwindcss/vite` | `^4.2.2` |
| Frontend TS | `typescript` | `~6.0.2` |
| Vite React plugin | `@vitejs/plugin-react` | `^6.0.1` |
| ESLint stack | `eslint` + `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` | `9.x` / `8.x` / `7.x` / `0.5.x` |
| Backend framework | `hono` | `^4.7.0` |
| Node server adapter | `@hono/node-server` | `^1.13.7` |
| ORM | `drizzle-orm` | `^0.40.0` |
| Migration CLI | `drizzle-kit` | `^0.30.0` |
| PG driver | `postgres` (postgres.js) | `^3.4.5` |
| Local Postgres | `embedded-postgres` | `18.3.0-beta.17` |
| Bundler (Lambda) | `esbuild` | `^0.25.0` |
| Dev runner | `tsx` | `^4.19.2` |
| Env loader | `dotenv` | `^16.4.7` |
| Backend TS | `typescript` | `^5.7.0` |

### Per-app adds (installed by `/create-euna-app`, not in the shipped `package.json`)
- `zod@^3`, `@hono/zod-openapi@^0.18` — request validation + OpenAPI spec
- `babel-plugin-react-compiler` (dev, frontend) — React 19 compiler

### Cloud deploy targets
| Layer | Service |
|---|---|
| Frontend host | **AWS Amplify** (static CDN, auto-deploy from GitHub `main`) |
| API proxy | **AWS API Gateway** (HTTP API) |
| API compute | **Single AWS Lambda** (Node 20, esbuild-bundled) via `hono/aws-lambda` |
| Migrations | Separate AWS Lambda (invoked out-of-band before app release) |
| Database | **Amazon Aurora Serverless v2** — PostgreSQL (scales to zero) |
| Secrets | **AWS Secrets Manager** (DB creds → Lambda env vars) |
| Auth | **Cloudflare Access + Active Directory** (in front of Amplify) |
| Logs | **Amazon CloudWatch** |
| IaC | **Terraform** (shared infra module) + **AWS SAM** (per-app Lambda) |

### Never use
- Next.js / Remix / any SSR framework — Amplify serves static only.
- Per-route Lambdas — one Lambda for all routes via Hono. Exception: migrations Lambda.
- EC2, ECS, Fargate, RDS Provisioned, S3 static hosting, Elastic Beanstalk, Cognito.
- Prisma / TypeORM / Sequelize / Knex or raw concatenated SQL — Drizzle only.
- Fastify / Express / tRPC — Hono only.
- `pg` / node-postgres — driver is `postgres` (postgres.js); Drizzle import is `drizzle-orm/postgres-js`.

---

## Pre-deploy Compliance Checks

Run these against the app repo and report pass/fail for each. **Stop and escalate** on any failure — do not try to "fix forward" through deployment.

### Repo layout
- [ ] Top-level `backend/` and `frontend/` folders exist (NOT `apps/*` or `packages/*` — this is flat, matching the kit). If the user is working inside a `vibe-coded-app-kit` clone, `app/backend/` + `app/frontend/` is also acceptable.
- [ ] `backend/` has `src/app.ts`, `src/index.ts`, `src/lambda.ts`, `src/db/client.ts`, `src/db/schema.ts`, `drizzle.config.ts`, `migrations/`.
- [ ] `frontend/` has `vite.config.ts`, `src/main.tsx`, `src/api.ts`, `src/styles.css`, project-reference tsconfigs (`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`).
- [ ] No `Dockerfile`, `Containerfile`, or `docker-compose.yml`.

### Backend code
- [ ] `src/lambda.ts` exports `handler` via `handle(app)` from `hono/aws-lambda`.
- [ ] `src/index.ts` is local-only — uses `@hono/node-server`, NOT `hono/aws-lambda`.
- [ ] `src/db/client.ts` imports from `drizzle-orm/postgres-js` and `postgres`. Must NOT import from `drizzle-orm/node-postgres` or `pg`.
- [ ] DB connection string reads from `DATABASE_URL` OR `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD`. Nothing hardcoded.
- [ ] Every Hono route under `src/routes/` uses `OpenAPIHono` + Zod. No routes that skip validation.
- [ ] CORS `origin` reads from `process.env.ALLOWED_ORIGIN`. `*` is permitted only as a local-dev fallback.
- [ ] `scripts/build.mjs` exists and bundles `src/lambda.ts` → `dist/lambda.mjs` with esbuild (platform `node`, target `node20`, format `esm`).
- [ ] `migrations/` directory exists and is non-empty; migration files are committed.

### Frontend code
- [ ] Builds to static output only (`vite build` → `dist/`). No SSR, no `@vercel/*`, no `next/*`.
- [ ] API base URL comes from `import.meta.env.VITE_API_BASE_URL`. No hardcoded URLs.
- [ ] `vite.config.ts` loads `@tailwindcss/vite` and `@vitejs/plugin-react` (with `babel-plugin-react-compiler`).
- [ ] No `useMemo`, `useCallback`, or `React.memo` in `src/` (React 19 compiler handles memoization).

### Versions (must match the kit's pins)
- [ ] `frontend/package.json`: `react ^19.2.5`, `vite ^8.0.9`, `tailwindcss ^4.2.2`, `typescript ~6.0.2`, `@vitejs/plugin-react ^6.0.1`.
- [ ] `backend/package.json`: `hono ^4.7.0`, `drizzle-orm ^0.40.0`, `drizzle-kit ^0.30.0`, `postgres ^3.4.5`, `embedded-postgres 18.3.0-beta.17`, `esbuild ^0.25.0`, `typescript ^5.7.0`.
- [ ] `zod` and `@hono/zod-openapi` are present in `backend/package.json` (added per-app by `/create-euna-app`).

### Secrets and config hygiene
- [ ] No secrets, tokens, API keys, or Aurora ARNs in source or committed files.
- [ ] `.env` files are gitignored; only `.env.example` with placeholders is committed.
- [ ] `package-lock.json` is committed for both `backend/` and `frontend/`.

### Local verification (required before running the pipeline)
- [ ] `cd backend && npm install && npm run db:start && npm run db:migrate && npm run dev` → server on :3000, `/openapi.json` returns 200.
- [ ] `cd frontend && npm install && npm run dev` → Vite on :5173, UI loads and can reach the backend.
- [ ] `npm run build` in both folders succeeds with no TypeScript errors.

---

## Pipeline (to be filled in)

_This section will contain:_
- _GitHub Actions workflow for the frontend (auto-deploy to Amplify on push to `main`)._
- _GitHub Actions workflow for the backend (build `dist/lambda.mjs` via `scripts/build.mjs`, then `sam deploy`)._
- _Terraform module inputs exposed by the Euna infra team (VPC IDs, subnet IDs, Aurora cluster, Secrets Manager ARNs, OIDC deploy role ARN)._
- _AWS SAM template for the single Hono Lambda (VPC-attached to reach Aurora) + separate migrations Lambda._
- _Secrets plumbing from Secrets Manager to Lambda env (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `ALLOWED_ORIGIN`)._
- _Cloudflare Access + Active Directory configuration in front of the Amplify domain._
- _Post-deploy smoke test: invoke migrations Lambda, hit `GET /openapi.json` through the public URL, confirm 200._
- _Admin-facing CloudWatch log surface endpoint wiring._

When this section is populated, walk the user through it step-by-step and confirm every AWS-touching action before taking it.

---

## What to Never Do

- Do not deploy while the pipeline section is still a placeholder. Stop and tell the user the infra team still needs to wire it up.
- Do not run `aws`, `terraform`, or `sam` commands yourself until the pipeline is written and the user explicitly confirms.
- Do not modify `backend/src/lambda.ts` or the build script to target a non-Node-20 runtime.
- Do not introduce per-route Lambdas in the SAM template — one Lambda per app, plus the migrations Lambda.
- Do not widen CORS to `*` in prod.
- Do not commit secrets or ARNs.
