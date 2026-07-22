# StayFlow — Support

> Product context: [PRD.md](PRD%20%28Product%20Requirements%20Document%29.md). Deployment details: [Architecture.md](Architecture.md#deployment).

## Getting help / reporting issues

This is a portfolio project maintained by a single author (QUAN7UM). For bugs, questions, or vulnerability reports, use the repository's GitHub Issues page. Do not include real credentials, customer data, or connection strings in any report — see [Security.md](Security.md).

## Installation

```bash
# 1. Clone
git clone https://github.com/dooddles07/StayFlow.git && cd StayFlow

# 2. Install frontend deps
bun install

# 3. Configure env — single file, repo root only (deliberately no server/.env)
cp .env.example .env   # set DATABASE_URL, JWT_SECRET, VITE_API_URL (+ PORT/CORS_ORIGIN if running the standalone backend dev server)

# 4. Backend deps + DB
cd server && npm install
cd ..
# From root — the migration history is incomplete (see Schema.md), so `prisma migrate
# deploy` will NOT produce a schema matching schema.prisma. Use db push instead:
./server/node_modules/.bin/prisma db push --schema=server/prisma/schema.prisma
cd server && npm run seed && cd ..   # optional: SEED_PASSWORD=... node prisma/seed.js

# 5. Run (dev)
bun --bun run dev                    # http://localhost:3000

# 6. Test / build
bun --bun run test
bun --bun run build && bun --bun run start   # prod-style merged server
```

Full env var reference: [Security.md](Security.md#environment-variables). Schema workflow detail: [Schema.md](Schema.md#schema-change-workflow).

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Server exits: `Missing required env var` | `DATABASE_URL`/`JWT_SECRET` unset | Set them in the root `.env` or Railway — there is no `server/.env` |
| `Environment variable not found: DATABASE_URL` from Prisma CLI | Ran `cd server && prisma ...` — Prisma looks for `.env` in the CWD, and there's none in `server/` | Run from root instead: `./server/node_modules/.bin/prisma <cmd> --schema=server/prisma/schema.prisma` |
| `401 Invalid or expired token` after reset | `tokenVersion` bumped → old session revoked | Sign in again |
| Stuck on "Set your password" screen after login | `mustChangePassword` still `true` — expected for a freshly management-issued login | Complete the form (or use forgot-password) — both clear the flag |
| `429 Too many attempts` on login | rate limit / account lock | Wait window (15 min lock, 15 min login window) |
| CORS blocked in browser | origin not in `CORS_ORIGIN` | Add exact origin to allowlist |
| Reset link never arrives | mailer is stubbed without `RESEND_API_KEY` | Check server console (dev); set `RESEND_API_KEY` (prod) |
| Detail page 404s only on refresh | SSR wasn't forwarding auth cookie (fixed) | Update to latest; if recurring, check `scripts/start.mjs` cookie forwarding |
| Debugging | — | Watch morgan logs + `auth_events`/`admin_action_events` tables |

## Demo access

See [Security.md](Security.md#demo-logins-development--preview-only) for demo portal credentials. Seeded accounts only — not real user data.

## Known limitations

- No payment/billing (see [PRD.md](PRD%20%28Product%20Requirements%20Document%29.md)).
- No background jobs/scheduler — reminders and expiry are not automated.
- Email delivery (Resend) only works with `RESEND_API_KEY` set — without it, reset/email-change links are logged to console instead of sent (dev and prod alike).
