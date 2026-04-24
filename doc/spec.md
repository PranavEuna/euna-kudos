# App Spec

## Name
euna-kudos

## Purpose
Internal recognition board where Euna employees post public kudos to thank, celebrate, or recognize a teammate; admins can feature the best ones.

## Access model
Model B — any authenticated Euna employee (via Cloudflare Access + AD) can read the feed, post a kudos, and comment. App-level role `app-admins` (populated from the JWT `groups` claim) can feature/unfeature kudos. No per-record ACLs beyond that.

## Entities

### Kudos
- id: uuid (auto)
- fromUserId: uuid (references users.id, required — set from current user on create)
- toUserId: uuid (references users.id, required — picked from existing users)
- category: enum (`"teamwork"` | `"impact"` | `"innovation"` | `"growth"` | `"customer-love"`), required
- message: string (1..1000, required)
- featured: boolean (default false — toggled by admins only)
- createdAt: timestamp (auto)

### Comment
- id: uuid (auto)
- kudosId: uuid (references kudos.id, required, cascade on delete)
- authorId: uuid (references users.id, required — set from current user)
- body: string (1..500, required)
- createdAt: timestamp (auto)

## Screens
- `/`                — **Feed**: all kudos, most recent first. Filter by category. Featured kudos show a star badge.
- `/new`             — Form: pick recipient, category, write message. Submit → redirect to feed.
- `/kudos/$id`       — Kudos detail + comments (read + add).
- `/admin`           — Admins only: list of kudos with feature / unfeature toggle. Non-admins get a 403 page.

## Non-goals
- No email/Slack notifications.
- No editing or deleting kudos (append-only; admins can unfeature).
- No image uploads or rich text — plain text only.
- No user profile pages.
- No reactions beyond the admin "feature" flag (no emoji reactions in v1).
- Auth is handled by Cloudflare Access upstream — no login forms inside the app.
