# Euna Vibe App Creator

You are helping an Euna Solutions employee build a vibe-coded web app from the **vibe-coded-app-kit** app skeleton. The goal is **one-shot generation**: given a short spec, produce a working local app end-to-end with no back-and-forth.

This skill is the source of truth for stack, structure, and coding patterns. The shipped `backend/` + `frontend/` skeletons are the source of truth for versions, tsconfig, and tooling. If this skill and the skeletons disagree on a version or config, the skeletons win. The canonical copy lives in the **Euna-AI/vibe-coded-app-kit** GitHub repo (AI team / architecture collaboration); end users typically receive it as a ZIP via SharePoint or Confluence.

> **Design alignment:** This skill aligns with `design.md` (the architecture design document). Where behavior is specified in both, `design.md` is authoritative. Open platform questions tracked in `design.md` §14 (origin protection, Postgres version pin) are called out inline below.

---

## Starting Point

Users arrive with the skeleton on disk in one of these shapes:

```
# Shape A — ZIP download from SharePoint/Confluence (most common)
my-app/
├── backend/          # Unzipped straight into the project root
└── frontend/

# Shape B — Working inside a clone of the kit repo (AI team only)
vibe-coded-app-kit/
├── doc/
├── skills/
└── app/
    ├── backend/
    └── frontend/
```

Both shapes are **single-repo** — `backend/` and `frontend/` live side by side, not in separate repos. One repo per app, from the shared skeleton. This matches `design.md` §2 ("one repo per app, from a shared template").

Detect which shape the user is in before anything else:
1. If `backend/package.json` and `frontend/package.json` exist at the project root → **Shape A**. Work in place.
2. If `app/backend/package.json` exists → **Shape B**. Either copy `app/backend` and `app/frontend` up to a new folder (preferred, keeps the kit repo clean) or work inside `app/` if the user explicitly wants to.
3. If neither is present, stop and ask the user where the skeleton lives. Do NOT try to `git clone` the kit repo — users may not have GitHub access.

Once located:
1. Rename the `"name"` fields in both `package.json` files to the app name.
2. Read `doc/spec.md` (or `spec.md` at the root) if it exists — it drives the one-shot build. If it doesn't exist, ask the user the intake questions at the bottom and write the answers to `doc/spec.md` before coding.

---

## Tech Stack (authoritative — pinned by the kit)

### Local dev
| Layer | Package | Pinned version |
|---|---|---|
| Frontend build | `vite` | `^8.0.9` |
| React | `react`, `react-dom` | `^19.2.5` |
| Styling | `tailwindcss`, `@tailwindcss/vite` | `^4.2.2` |
| Frontend TS | `typescript` | `~6.0.2` |
| Vite React plugin | `@vitejs/plugin-react` | `^6.0.1` |
| Routing | `@tanstack/react-router` | `^1.x` |
| Server state | `@tanstack/react-query` | `^5.x` |
| Forms | `react-hook-form` + `@hookform/resolvers` | `^7.x` / `^3.x` |
| UI components | `shadcn/ui` (copied into `src/components/ui/`) | n/a — source files, not a dep |
| Radix primitives | `@radix-ui/*` (installed per shadcn component) | pinned by shadcn CLI |
| ESLint | `eslint` + `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` | `9.x` / `8.x` / `7.x` / `0.5.x` |
| Backend framework | `hono` | `^4.7.0` |
| Node server adapter | `@hono/node-server` | `^1.13.7` |
| ORM | `drizzle-orm` | `^0.40.0` |
| Migration CLI | `drizzle-kit` | `^0.30.0` |
| PG driver | `postgres` (postgres.js) | `^3.4.5` |
| Local Postgres | `embedded-postgres` | ⚠️ see parity note below |
| Bundler (Lambda) | `esbuild` | `^0.25.0` |
| Dev runner | `tsx` | `^4.19.2` |
| Env loader | `dotenv` | `^16.4.7` |
| Backend TS | `typescript` | `^5.7.0` |

> ⚠️ **Postgres version parity.** `design.md` §12 flags that the POC pins `embedded-postgres@18.3.0-beta.17` (Postgres 18 beta) while Aurora supports up to PostgreSQL 17.6. Recommendation in the design is to pin to the 17.x release matching Aurora. Whatever version the skeleton's `backend/package.json` pins, use that. Do not upgrade to a newer `embedded-postgres` major version without explicit approval — features introduced in Postgres 18 (newer JSON functions, MERGE refinements) will not work in Aurora.

> **TypeScript pin.** The frontend pins TypeScript `~6.0.2` and the backend pins `^5.7.0`. These are the kit's current pins — do not downgrade either. If your environment objects to TS 6, check the skeleton's `package.json` first; skeleton wins.

### Adds on top of the skeleton (not yet in its `package.json` — install per-app)
The skeleton does not ship validation, OpenAPI, or the React Compiler plugin yet. For any app, add:

**Backend:**
- `zod` — validate every request body/query/param
- `@hono/zod-openapi` — typed routes + auto `/openapi.json`
- `@hono/swagger-ui` — optional, mounts `/docs`

**Frontend:**
- `@tanstack/react-router` + `@tanstack/router-devtools` + `@tanstack/router-plugin` (Vite plugin for file-based routing)
- `@tanstack/react-query` + `@tanstack/react-query-devtools`
- `react-hook-form` + `@hookform/resolvers` + `zod`
- `babel-plugin-react-compiler` (devDep)
- `openapi-typescript` + `openapi-fetch` — for generating the typed API client from `/openapi.json`

### Cloud deploy targets (used for compliance only — actual deploy handled by `/deploy-euna-app`)
| Layer | Service |
|---|---|
| Frontend host | AWS Amplify (static CDN, auto-deploy from GitHub; `dev` → staging, `main` → production) |
| API proxy | AWS API Gateway (HTTP API, private origin behind Cloudflare) |
| API compute | **Single** AWS Lambda (Node 20, bundled via esbuild) with `hono/aws-lambda` adapter |
| Migrations | Separate **Migrator Lambda** (invoked synchronously in deploy pipeline before app Lambda cutover — see `design.md` §10) |
| Database | Amazon Aurora Serverless v2 — PostgreSQL 17.x (one cluster per app, auto-pause to 0 ACU) |
| Secrets | AWS Secrets Manager (namespaced `/apps/{app-name}/*`, DB creds injected into Lambda env by Terraform/SAM) |
| Auth | Cloudflare Access + Active Directory (in front of everything — see Auth section below) |
| Logs | Amazon CloudWatch (structured JSON; viewable in-app via `/admin/logs`) |
| IaC | Terraform (shared `vibe_app` module, owned by CloudOps) + AWS SAM (Lambda) |

### Never use
- Next.js, Remix, Astro SSR, or any server-rendered framework — Amplify serves static only.
- Prisma, TypeORM, Sequelize, Knex, raw concatenated SQL — Drizzle only; always parameterized.
- Fastify, Express, tRPC — Hono only.
- `pg` / node-postgres — skeleton uses `postgres` (postgres.js). Drizzle import must be `drizzle-orm/postgres-js`.
- `react-router-dom` — use `@tanstack/react-router` for type-safe params and search params.
- Per-route Lambdas — one Lambda handles every route via Hono. Exception: Migrator Lambda.
- EC2, ECS, Fargate, RDS Provisioned, S3 static hosting, Elastic Beanstalk, Cognito.
- Auth inside the app — Cloudflare Access handles it upstream. The app only reads the JWT to identify the user (see Auth section).
- React 19 Actions (`useActionState`, `<form action={fn}>`) for forms — use `react-hook-form` + `zod`. Actions are not prohibited for non-form mutations but they're not the default pattern.
- Cross-folder relative imports of backend source from frontend (e.g. `import type { AppType } from "../../backend/src/app"`). Use the generated OpenAPI client instead.
- `tailwind.config.js` unless a plugin requires it — config lives in CSS via `@theme`.
- `useMemo`, `useCallback`, `React.memo` — React 19 compiler handles memoization.

---

## Project Structure (matches the kit — flat, not a monorepo)

```
my-app/                            # Single repo, one app
├── README.md
├── doc/
│   └── spec.md                   # One-shot spec (see example at bottom)
├── backend/
│   ├── package.json              # type: module
│   ├── tsconfig.json             # target ES2022, module NodeNext, strict
│   ├── drizzle.config.ts
│   ├── .env.example
│   ├── scripts/
│   │   ├── dev.mjs
│   │   ├── build.mjs
│   │   ├── db-start.mjs
│   │   ├── db-stop.mjs
│   │   ├── db-reset.mjs
│   │   └── db-psql.mjs
│   ├── migrations/               # drizzle-kit generate output (committed)
│   └── src/
│       ├── app.ts                # Hono app + route registration
│       ├── index.ts              # Local entry (@hono/node-server)
│       ├── lambda.ts             # Prod entry (hono/aws-lambda)
│       ├── db/
│       │   ├── client.ts
│       │   └── schema.ts         # pgTable definitions (includes `users`)
│       ├── routes/
│       │   ├── <entity>.ts       # One file per entity
│       │   └── admin.ts          # /admin/logs, /admin/metrics, etc.
│       ├── middleware/
│       │   ├── error.ts
│       │   ├── request-id.ts
│       │   └── auth.ts           # JWT validation + JIT user provisioning
│       └── schemas/
│           └── <entity>.ts       # Zod schemas (exported; frontend consumes via OpenAPI)
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.app.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    ├── index.html
    ├── .env.example
    ├── eslint.config.js
    └── src/
        ├── main.tsx
        ├── router.tsx            # TanStack Router config
        ├── routes/               # File-based routes (TanStack Router)
        │   ├── __root.tsx
        │   ├── index.tsx
        │   └── <entity>/...
        ├── api/
        │   ├── client.ts         # openapi-fetch client from generated types
        │   └── generated.ts      # GENERATED from backend /openapi.json
        ├── components/
        │   └── ui/               # shadcn/ui components (copied, not imported)
        ├── lib/
        │   └── utils.ts          # shadcn utility (cn helper)
        ├── hooks/
        ├── styles.css            # @import "tailwindcss"; + @theme
        └── components.json       # shadcn/ui config
```

---

## Authentication & Users (every app)

Every app includes a `users` table and auth middleware. This is **not optional** — it's part of the skeleton. The skeleton ships with the table, middleware, and dev-mode stub already in place.

### The users table

The skeleton's `backend/src/db/schema.ts` includes, at minimum:

```ts
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

Apps may add per-user fields (preferences, role, etc.) but must keep the four columns above.

### JIT user provisioning

Cloudflare Access authenticates *who* someone is. The app's `users` table tracks them for ownership, audit, and per-user data. Users are provisioned **lazily on first sight**:

```ts
// backend/src/middleware/auth.ts — shipped by the skeleton
import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { verifyAccessJwt } from "./jwt.js"; // JWKS-cached Cloudflare Access validator

type AuthVars = {
  user: { id: string; email: string; name: string | null; groups: string[] };
};

export const requireAuth = createMiddleware<{ Variables: AuthVars }>(async (c, next) => {
  let email: string;
  let name: string | null = null;
  let groups: string[] = [];

  if (process.env.AUTH_MODE === "local_mock") {
    // Dev-mode: read identity from a custom header set by the frontend.
    if (process.env.NODE_ENV === "production") {
      return c.json({ error: "mock_auth_disabled" }, 500); // defence in depth
    }
    const devEmail = c.req.header("x-dev-user-email");
    if (!devEmail) return c.json({ error: "unauthenticated" }, 401);
    email = devEmail;
    name = devEmail.split("@")[0];
  } else {
    // Cloud: validate the Cloudflare Access JWT
    const token = c.req.header("cf-access-jwt-assertion");
    if (!token) return c.json({ error: "unauthenticated" }, 401);
    const claims = await verifyAccessJwt(token, process.env.ACCESS_AUD!);
    email = claims.email;
    name = claims.name ?? null;
    groups = claims.groups ?? [];
  }

  // JIT provision — same path in dev and cloud
  let [row] = await db.select().from(users).where(eq(users.email, email));
  if (!row) {
    [row] = await db.insert(users).values({ email, name }).returning();
  }
  c.set("user", { id: row.id, email: row.email, name: row.name, groups });
  await next();
});
```

Apply `requireAuth` to every route group that isn't explicitly public:

```ts
app.use("/items/*", requireAuth);
app.use("/admin/*", requireAuth);
```

### JWT validation details (cloud)

Cloudflare Access attaches a signed JWT to every origin request in the `Cf-Access-Jwt-Assertion` header. The middleware (via `verifyAccessJwt`) performs three checks:

1. **Signature** using Cloudflare's public keys at `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs` (cached in-container with TTL).
2. **Audience** — `aud` claim must equal `process.env.ACCESS_AUD` (set by Terraform per app).
3. **Expiry and issuer** — standard JWT validation via `jose`.

Never decode the JWT in the frontend. If the frontend needs to know who the user is, it calls `GET /api/me` on the backend. See `design.md` §6.

### Local dev auth stub

Local dev has no Cloudflare Access. The skeleton provides a minimal login screen that mirrors what SSO provides — an email address.

**Frontend behaviour (dev only):**
- Loads with `AUTH_MODE=local_mock`. If `localStorage.dev_user_email` is unset, renders a single-field email form.
- On submit, stores email in `localStorage` and reloads.
- All API requests include `X-Dev-User-Email: <email>` header.
- Header component shows the email and a "Sign out" link that clears `localStorage`.

**Defence-in-depth guardrails (shipped with skeleton — do not remove):**
- Frontend wraps all `X-Dev-User-Email` logic in `import.meta.env.DEV` checks. Vite strips the branch from production builds.
- Backend middleware rejects any request with `X-Dev-User-Email` when `NODE_ENV=production`, returning 500.
- Backend middleware refuses to start if `AUTH_MODE=local_mock` and `NODE_ENV=production`.
- CI greps for `X-Dev-User-Email` references outside designated files.

### Access control model

Each app declares one of two models at provisioning time (`design.md` §6). The skill doesn't decide this — it's set in Terraform by CloudOps based on the intake spec.

- **Model A:** IT manages access via AD group (e.g., only members of `euna-expenses-users` can reach the app). App doesn't check roles; anyone who arrives is authorised.
- **Model B:** Any authenticated Euna employee can reach the app. App reads `user.groups` from the JWT, or stores role data in its own table, to control what each user can *do*.

For Model B, if you need group-based authorisation and want to exercise it in dev:
- Preferred: store role data in a per-app table (`user_roles`), seeded via a dev script. Same logic runs in both environments.
- Alternative: expose a dev-only UI to set fake groups. More realistic but more scaffolding.

Ask the user which model their app uses if the spec doesn't say.

---

## Backend Patterns

### Hono app (single Lambda target)

```ts
// backend/src/app.ts
import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { itemsRoutes } from "./routes/items.js";
import { adminRoutes } from "./routes/admin.js";
import { errorHandler } from "./middleware/error.js";
import { requestId } from "./middleware/request-id.js";
import { requireAuth } from "./middleware/auth.js";

export const app = new OpenAPIHono();

app.use("*", requestId());
app.use("*", cors({
  origin: process.env.ALLOWED_ORIGIN ?? "*", // SAM injects prod Amplify origin
  credentials: true,
}));
app.onError(errorHandler);

app.use("/api/*", requireAuth);
app.use("/admin/*", requireAuth);

app.get("/api/me", (c) => {
  const user = c.get("user");
  return c.json(user);
});

app.route("/api/items", itemsRoutes);
app.route("/admin", adminRoutes);

app.doc("/openapi.json", {
  openapi: "3.1.0",
  info: { title: "My App API", version: "1.0.0" },
});

export type AppType = typeof app;
```

```ts
// backend/src/index.ts — local dev entry
import { serve } from "@hono/node-server";
import "dotenv/config";
import { app } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port });
console.log(JSON.stringify({ level: "info", msg: "api up", port }));
```

```ts
// backend/src/lambda.ts — prod entry (bundled by scripts/build.mjs)
import { handle } from "hono/aws-lambda";
import { app } from "./app.js";
export const handler = handle(app);
```

### Route pattern (Zod + OpenAPI)

```ts
// backend/src/routes/items.ts
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { db } from "../db/client.js";
import { items } from "../db/schema.js";

const Item = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  createdAt: z.string().datetime(),
}).openapi("Item");

const CreateItem = z.object({
  name: z.string().min(1).max(200),
}).openapi("CreateItem");

export const itemsRoutes = new OpenAPIHono();

itemsRoutes.openapi(
  createRoute({
    method: "get",
    path: "/",
    responses: {
      200: { content: { "application/json": { schema: z.array(Item) } }, description: "list items" },
    },
  }),
  async (c) => c.json(await db.select().from(items))
);

itemsRoutes.openapi(
  createRoute({
    method: "post",
    path: "/",
    request: { body: { content: { "application/json": { schema: CreateItem } } } },
    responses: {
      201: { content: { "application/json": { schema: Item } }, description: "created" },
    },
  }),
  async (c) => {
    const input = c.req.valid("json");
    const [row] = await db.insert(items).values(input).returning();
    return c.json(row, 201);
  }
);
```

### DB client — connection-per-invocation (postgres.js + drizzle)

```ts
// backend/src/db/client.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

function connectionString(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL; // local dev
  // Cloud: Terraform/SAM injects these from Secrets Manager (/apps/{app-name}/db/*)
  const { DB_HOST, DB_PORT = "5432", DB_NAME, DB_USER, DB_PASSWORD } = process.env;
  if (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASSWORD) {
    throw new Error("missing DB env vars");
  }
  return `postgres://${DB_USER}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require`;
}

// Aurora auto-pause is incompatible with RDS Proxy, so Lambdas talk to Postgres
// directly. `max: 1` enforces one connection per Lambda container; combined with
// the platform's reserved concurrency cap (10-20 per function, set in Terraform
// by the vibe_app module), this keeps total connections well below Aurora's
// max_connections. See design.md §4.
const client = postgres(connectionString(), { max: 1, prepare: false });
export const db = drizzle(client);
```

**Concurrency notes (design.md §4):**
- Reserved concurrency cap of 10–20 per function is enforced by the `vibe_app` Terraform module — you don't set it in the app.
- Use connection-per-invocation: open, query, close. Don't introduce module-level pooling beyond what `postgres.js` does with `max: 1`.
- Aurora `max_connections` is set in the cluster parameter group to match expected peak.

### Schema (includes users from day one)

```ts
// backend/src/db/schema.ts
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const items = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### drizzle.config.ts

```ts
// backend/drizzle.config.ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

### Error + request-id middleware

```ts
// backend/src/middleware/request-id.ts
import { createMiddleware } from "hono/factory";
import { randomUUID } from "node:crypto";

export const requestId = () => createMiddleware<{ Variables: { requestId: string } }>(async (c, next) => {
  const id = c.req.header("x-request-id") ?? randomUUID();
  c.set("requestId", id);
  c.header("x-request-id", id);
  await next();
});
```

```ts
// backend/src/middleware/error.ts
import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

export const errorHandler: ErrorHandler = (err, c) => {
  const requestId = c.get("requestId" as never);
  if (err instanceof ZodError) {
    console.warn(JSON.stringify({ level: "warn", requestId, msg: "validation_failed", issues: err.issues }));
    return c.json({ error: "validation_failed", issues: err.issues }, 400);
  }
  if (err instanceof HTTPException) return err.getResponse();
  console.error(JSON.stringify({ level: "error", requestId, msg: err.message, stack: err.stack }));
  return c.json({ error: "internal_error", requestId }, 500);
};
```

### scripts/build.mjs (esbuild → single Lambda bundle)

```js
// backend/scripts/build.mjs
import { build } from "esbuild";

await build({
  entryPoints: ["src/lambda.ts"],
  outfile: "dist/lambda.mjs",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  minify: true,
  sourcemap: "linked",
  banner: {
    js: `import { createRequire as _cR } from "module"; const require = _cR(import.meta.url);`,
  },
});
console.log("built dist/lambda.mjs");
```

---

## Frontend Patterns

### vite.config.ts

```ts
// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [
    TanStackRouterVite(), // must come before react()
    react({
      babel: { plugins: [["babel-plugin-react-compiler", {}]] },
    }),
    tailwindcss(),
  ],
  server: { port: 5173 },
});
```

### Tailwind v4 CSS entry

```css
/* frontend/src/styles.css */
@import "tailwindcss";

@theme {
  --color-brand-500: oklch(0.7 0.15 250);
  --font-sans: "Inter", system-ui, sans-serif;
}
```

### Routing (TanStack Router, file-based)

```tsx
// frontend/src/routes/__root.tsx
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { ColdStartBanner } from "../components/ColdStartBanner";
import { Header } from "../components/Header";

export const Route = createRootRoute({
  component: () => (
    <>
      <Header />
      <ColdStartBanner />
      <Outlet />
    </>
  ),
});
```

```tsx
// frontend/src/routes/items/$itemId.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";

export const Route = createFileRoute("/items/$itemId")({
  component: ItemDetail,
});

function ItemDetail() {
  const { itemId } = Route.useParams(); // fully typed
  const { data, isLoading, error } = useQuery({
    queryKey: ["item", itemId],
    queryFn: async () => {
      const { data } = await api.GET("/api/items/{id}", { params: { path: { id: itemId } } });
      return data;
    },
  });
  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Failed to load.</p>;
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
```

### Server state (TanStack Query)

Set up a single `QueryClient` in `main.tsx`:

```tsx
// frontend/src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen"; // generated by TanStackRouterVite
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});
const router = createRouter({ routeTree, context: { queryClient } });

declare module "@tanstack/react-router" {
  interface Register { router: typeof router }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);
```

Use TanStack Query for **any screen that reads data from the API**. After a mutation, invalidate the relevant queries:

```tsx
const mutation = useMutation({
  mutationFn: (payload) => api.POST("/api/items", { body: payload }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items"] }),
});
```

Read-only prose pages don't need Query. Don't over-engineer.

### Forms (react-hook-form + zod)

Use `react-hook-form` + `zod` for **every form**. Do NOT use React 19 Actions (`useActionState`, `<form action={fn}>`). Actions are fine for isolated buttons (logout, one-click toggle) but not the default pattern for data-entry forms.

```tsx
// frontend/src/routes/items/new.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { api } from "../../api/client";

const schema = z.object({
  name: z.string().min(1, "Required").max(200),
});
type FormValues = z.infer<typeof schema>;

export function NewItemForm() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const mutation = useMutation({
    mutationFn: (body: FormValues) => api.POST("/api/items", { body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      navigate({ to: "/items" });
    },
  });

  return (
    <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
      <Input {...form.register("name")} placeholder="Name" />
      {form.formState.errors.name && <p className="text-red-500">{form.formState.errors.name.message}</p>}
      <Button type="submit" disabled={mutation.isPending}>Create</Button>
    </form>
  );
}
```

The Zod schema above can be imported directly from a shared location if the backend exports it; otherwise it's defined on the client using the same shape the backend expects. OpenAPI-generated types keep the response shape in sync.

### UI components (shadcn/ui + Tailwind)

shadcn/ui components are **copied into the project**, not imported from npm. To add a component:

```bash
# from frontend/
npx shadcn@latest add button input dialog select table
```

Each component lands as source in `frontend/src/components/ui/<name>.tsx`. Edit freely.

Common components the skeleton or first build should pull in: `button`, `input`, `label`, `form`, `dialog`, `select`, `table`, `dropdown-menu`, `toast`, `alert`.

Style new components using Tailwind utility classes. Do NOT create a `tailwind.config.js` — Tailwind v4 config lives in `styles.css` under `@theme`.

### Typed API client (generated from OpenAPI)

The frontend does NOT import types from the backend source tree. Instead, the backend exposes `/openapi.json` (via `@hono/zod-openapi`) and the frontend generates types from it.

**Script in `frontend/package.json`:**
```json
{
  "scripts": {
    "generate-client": "openapi-typescript http://localhost:3000/openapi.json -o src/api/generated.ts"
  }
}
```

**Client setup:**
```ts
// frontend/src/api/client.ts
import createClient from "openapi-fetch";
import type { paths } from "./generated";

export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  // In dev, attach the stub header. Vite strips this branch in production builds.
  ...(import.meta.env.DEV && {
    fetch: async (input, init) => {
      const email = localStorage.getItem("dev_user_email");
      const headers = new Headers(init?.headers);
      if (email) headers.set("X-Dev-User-Email", email);
      return fetch(input, { ...init, headers });
    },
  }),
});
```

**Regenerate the client whenever the backend schema changes:**
```bash
# with backend running on :3000
cd frontend && npm run generate-client
```

The generated file (`src/api/generated.ts`) is **committed to the repo**. This makes frontend-only builds possible without the backend running.

### React 19 rules (enforced)
- Use TanStack Query for data fetching. Every fetch returns `isLoading`/`error`/`data` — handle all three.
- Use `react-hook-form` + `zod` for forms. Not Actions.
- Use `useOptimistic` for optimistic updates when it helps UX, but Query's `onMutate`/`onError` rollback usually covers the same need.
- Do NOT write `useMemo`, `useCallback`, or `React.memo` — the compiler handles memoization.
- `use()` + `<Suspense>` is allowed for non-data cases (lazy modules, etc.) but prefer TanStack Query for API data.

### Cold-start UX

Aurora auto-pause means the first request after 24h of idle takes 15–30 seconds (`design.md` §4). The frontend should communicate this honestly — don't let users stare at a blank screen.

The skeleton ships a `<ColdStartBanner>` component wired into `__root.tsx`: if the first in-flight query hasn't resolved within 3 seconds, it shows "Warming up… this can take up to 30 seconds the first time each day." TanStack Query's global `onSettled` or a simple timer on the root fetch drives it. Keep it, or swap for the app's own equivalent — but don't remove the pattern.

### .env.example (frontend)
```
VITE_API_BASE_URL=http://localhost:3000
```

---

## Admin / Observability Surface (every app)

Per `design.md` §11, every app ships with an authenticated admin surface so vibe-coders can debug their own apps without AWS console access. These routes are gated by membership in the `app-admins` group (from the JWT `groups` claim).

The skeleton ships all four backend routes and matching frontend pages:

| Route | Purpose | Backend behaviour |
|---|---|---|
| `/admin/logs` | Searchable, filterable log viewer | Lambda queries CloudWatch Logs Insights scoped to its own log group. In local dev, reads from stdout via a simple in-memory ring buffer. |
| `/admin/metrics` | Charts for invocations, error rate, p95 latency, DB failures | Lambda queries CloudWatch Metrics in cloud; reports `0`/empty in local dev. |
| `/admin/deploys` | Recent deploy history (commit SHA, time, who triggered) | Reads from a `deploys` table the deploy pipeline writes to. Empty in local dev until the pipeline runs. |
| `/admin/db` | Read-only SQL runner against the app's DB | Opt-in per app — only enable if the spec calls for it. Requires explicit `enable_admin_db = true` in the Terraform module. |

**Authorisation:** each admin route checks `user.groups.includes("app-admins")` after the standard `requireAuth` middleware and returns 403 if missing.

In local dev, the auth stub has no groups by default. Set fake groups via a dev-only query param or config file if you need to exercise the admin surface locally.

---

## Local Development

The app must run on **Node 20 + git + Claude only** — no Docker, no Podman, no external DB.

> ⚠️ **Windows PATH quirk — Claude Code + Git Bash.** Claude Code runs commands through Git Bash by default, which does not inherit the Windows system PATH set by the Node.js installer. Template `scripts/` files resolve `node`/`npx` via `path.dirname(process.execPath)` at runtime so Git Bash invocations don't fail to find the binaries. Do not rewrite the scripts to assume PATH is correct. See `design.md` §12.

Backend:
```bash
cd backend
npm install
npm run db:start          # Start embedded-postgres (once)
npm run db:generate       # Generate migration SQL from schema.ts
npm run db:migrate        # Apply migrations
npm run dev               # tsx watch src/index.ts on :3000
```

Frontend:
```bash
cd frontend
npm install
npm run generate-client   # Fetch /openapi.json and generate src/api/generated.ts
npm run dev               # Vite on :5173
```

### .env.example (backend)
```
DATABASE_URL=postgres://postgres:postgres@localhost:54329/appdb
ALLOWED_ORIGIN=http://localhost:5173
PORT=3000
AUTH_MODE=local_mock
NODE_ENV=development
```

### Parity gaps to be aware of

Carried from `design.md` §12. Document these in `doc/LOCAL_DEV.md` in every generated app:

- **Postgres version drift.** See parity note at the top of Tech Stack. Avoid features newer than Aurora's supported version.
- **Auth.** Dev email stub locally; real Cloudflare Access + AD in cloud. Group memberships only exist in cloud.
- **Cold starts.** None locally; Lambda cold starts of 15–30s in cloud.
- **NAT Gateway.** None locally; cloud egress goes through NAT. Matters only for IP-allowlisted external APIs.
- **Lambda runtime limits.** The 15-minute timeout and 512 MB ephemeral `/tmp` are not enforced locally. Long-running or big-filesystem operations that work on a laptop may fail in Lambda. For schema-only migrations this is fine; data backfills need a separate pattern (see `design.md` §10).
- **No `psql` metacommands.** `npm run db:psql` doesn't support `\d`, `\dt`, `\l`. Use `npm run db:studio` for schema exploration.

---

## Observability

- Log structured JSON via `console.log` / `console.warn` / `console.error` — CloudWatch ingests natively.
- Include `requestId` in every log line and every error response.
- Never log secrets, auth headers, full request bodies, or DB passwords.
- The in-app `/admin/logs` and `/admin/metrics` routes surface CloudWatch data without an AWS console.

---

## Security Checklist (every app, non-negotiable)

- [ ] No secrets / tokens / API keys / DB creds in source or committed files. `.env` is gitignored; `.env.example` only holds placeholders.
- [ ] All DB access through Drizzle (builder or `sql` template). Zero string-interpolated SQL.
- [ ] Every request body/query/param passes a Zod schema before reaching business logic.
- [ ] Every non-public route is behind `requireAuth` middleware.
- [ ] `AUTH_MODE=local_mock` guarded: middleware refuses to start if set while `NODE_ENV=production`. `X-Dev-User-Email` rejected in production. Vite strips dev auth branches from production builds.
- [ ] CORS `origin` is env-driven; `*` only for local dev. Prod pin matches the Amplify URL injected by SAM.
- [ ] No `eval`, `new Function`, dynamic `require`, or `child_process` with user input.
- [ ] `package-lock.json` committed (exact versions).
- [ ] Frontend never shows raw DB/stack traces — map to generic user-safe messages.
- [ ] No auth flow inside the app beyond the JWT-reading middleware — Cloudflare Access + AD sits upstream.
- [ ] Migrations committed; no ad-hoc `ALTER TABLE` in app code.
- [ ] Generated API client (`src/api/generated.ts`) committed. No cross-folder TypeScript imports from frontend into backend source.

---

## One-Shot Build Flow

When the user invokes this skill:

1. **Detect the skeleton shape** (see "Starting Point"). Shape A is the default; Shape B is AI-team only.
2. **Confirm the skeleton ships the `users` table and auth middleware.** If either is missing, stop and tell the user the skeleton is out of date — do not build without them.
3. **Look for `doc/spec.md`** (or `spec.md` at the root). If present, read it and treat it as the complete intake.
4. **If no spec.md**, ask these intake questions in order and write answers to `doc/spec.md` before coding:
   - App name (kebab-case for folder, Title Case for UI)
   - Purpose in one sentence
   - **Access model** (Model A = IT-gated by AD group, Model B = any Euna employee + app-level roles — see Auth section)
   - Entities with fields + types (translate plain English → Drizzle schema)
   - User flows / screens (list, detail, create, edit — only what's needed)
   - Any special constraints (file uploads? background jobs? they likely mean "no")
5. **Update `name` fields** in both `package.json` files to match the app name.
6. **Install extra deps the skeleton lacks but this skill requires**:
   ```bash
   # backend
   npm install zod @hono/zod-openapi @hono/swagger-ui
   # frontend
   npm install @tanstack/react-router @tanstack/react-query react-hook-form @hookform/resolvers zod
   npm install -D @tanstack/router-plugin @tanstack/router-devtools @tanstack/react-query-devtools babel-plugin-react-compiler openapi-typescript openapi-fetch
   # frontend shadcn/ui
   npx shadcn@latest init
   npx shadcn@latest add button input label form dialog select table
   ```
7. **Write `schema.ts`** from the spec entities, preserving the shipped `users` table. Ownership relations reference `users.id`. Run `npm run db:generate` to produce the initial migration.
8. **Write one `routes/<entity>.ts`** per entity using the `OpenAPIHono` + Zod pattern. Only the CRUD verbs the spec actually needs. Apply `requireAuth` to each route group.
9. **Wire routes in `app.ts`** under `/api/*`, keep `/admin/*` mounted, and expose `/openapi.json`.
10. **Generate the frontend API client:** start the backend (`npm run dev` in `backend/`), then in `frontend/` run `npm run generate-client`.
11. **Write the frontend:**
    - Configure TanStack Router (file-based routes under `src/routes/`), TanStack Query (`QueryClientProvider` in `main.tsx`).
    - One route file per screen in the spec.
    - Data reads: `useQuery` + `openapi-fetch` client.
    - Forms: `react-hook-form` + `zodResolver`, submit via `useMutation`, invalidate queries on success.
    - shadcn/ui components for inputs, buttons, tables, dialogs. Tailwind classes for layout.
    - Keep the shipped `<ColdStartBanner>` and header-with-logout.
12. **Smoke-test locally:** run backend + frontend, hit `/openapi.json`, sign in with a test email via the dev stub, confirm JIT user row is created in the `users` table, and verify one create + one list round-trip works for each entity.
13. **Stop before deploying.** Tell the user to run `/deploy-euna-app` when ready. Do NOT touch AWS.

---

## `doc/spec.md` example (for one-shot testing)

Encourage users to draft this in advance. If it exists, Claude builds from it without further questions.

```markdown
# App Spec

## Name
my-task-tracker

## Purpose
Internal team tool for tracking task status across the quarter.

## Access model
Model A — restrict to AD group `euna-task-tracker-users`.
(Alternative: Model B — any Euna employee, with `app-admins` group controlling write access.)

## Entities

### Task
- id: uuid (auto)
- title: string (1..200, required)
- status: enum ("todo" | "doing" | "done"), default "todo"
- assigneeId: uuid (references users.id, nullable)
- ownerId: uuid (references users.id, required — set from current user on create)
- dueDate: date (nullable)
- createdAt: timestamp (auto)

## Screens
- /          — list of tasks with status filter
- /new       — create task form
- /$taskId   — task detail + edit

## Non-goals
- No auth inside the app beyond the standard JWT middleware (Cloudflare Access handles identity).
- No attachments, comments, notifications.
```

---

## What to Never Do

- Do not run `aws`, `terraform`, `sam deploy`, or any cloud CLI. Code only.
- Do not deviate from the pinned versions without a stated reason and user approval. Do not downgrade TypeScript or Vite — the kit pins TS 6 on the frontend intentionally.
- Do not add login/signup forms — Cloudflare Access is upstream; the app only reads the JWT.
- Do not remove the `users` table, the auth middleware, the dev-mode email stub, or the defence-in-depth guardrails against it leaking to production.
- Do not remove or bypass the `/admin/*` routes — they're part of the observability contract.
- Do not produce multi-region, HA, or blue/green configs — sandbox-tier only.
- Do not add a Dockerfile or Podman config — local is native Node; cloud is SAM-bundled Lambda.
- Do not introduce SSR (Next.js, Remix, Astro SSR).
- Do not swap the PG driver (stays `postgres` / postgres.js) or the ORM (stays Drizzle).
- Do not use `react-router-dom`, React 19 form Actions for forms, or a cross-folder relative import of backend source from frontend — all three are explicit rejections with rationale in this skill and in `design.md`.
- Do not mock or stub the DB in local dev — embedded-postgres runs for real.
- Do not bypass the Migrator Lambda pattern — schema changes go through the committed `migrations/` folder, applied by drizzle-kit locally and by the Migrator Lambda in cloud. Ad-hoc `ALTER TABLE` in app code is forbidden.
