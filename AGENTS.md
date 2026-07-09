# AGENTS.md — AI assistant context for Bow & Tie

> This file is auto-loaded by AI coding assistants (Cursor, Claude Code, GitHub
> Copilot, Windsurf, etc.). It gives you the project's architecture and the
> hard rules. For the full human-readable walkthrough, read
> `proposal/Backend-Developer-Handoff.md`.

## What this is
Bow & Tie (BowClips) — a full-stack boutique e-commerce store for handcrafted
hair accessories. Market: Dhaka, Bangladesh. Currency: **BDT (৳)**.

- `backend/` — Node + Express + Prisma REST API (TypeScript, run via `tsx`, no build step in dev).
- `frontend/` — React 19 + Vite + TypeScript storefront **and** admin panel (`/admin`).

The app runs today with **zero external accounts**. Every third-party
integration (email, WhatsApp, couriers, social login, payment) has a
**dev-fallback**: no credentials → it logs to console / returns a mock, and goes
live when credentials are added.

## Architecture map
- Entrypoint: `backend/src/index.ts` (connects DB, starts server + background schedulers).
- Express app + route mounting + CORS: `backend/src/app.ts`.
- **All env vars + business rules** (shipping zones, thresholds): `backend/src/config.ts`.
- DB schema: `backend/prisma/schema.prisma`. Seed: `backend/prisma/seed.ts`.
- Routes: `backend/src/routes/` (`auth, products, orders, account, cart, newsletter, promotions, upload, admin`).
- Cross-cutting logic: `backend/src/lib/` (`mailer, emails, whatsapp, courier, oauth, promotions, importProducts, serialize, user, auth, ids`).
- Middleware: `backend/src/middleware/auth.ts` (`requireAuth, requireAdmin, requireStaff, checkPermission`).
- Frontend API client: `frontend/src/services/` (`api.ts`, `db.ts`, `admin.ts`).
- Frontend state: `frontend/src/store/` (Context providers).

## Commands
```bash
# backend/
npm run dev         # start API (tsx watch) → http://localhost:4000
npm run typecheck   # tsc --noEmit — MUST stay clean
npm run seed        # reload demo data
npm run prisma:push # apply schema to dev DB (SQLite)
npm run db:reset    # wipe + reseed

# frontend/
npm run dev         # Vite dev server → http://localhost:5173
npm run build       # production build — MUST pass
npm run lint        # eslint
```
Health check: `GET http://localhost:4000/api/health`.
Demo admin: `admin@bowclips.com` / `admin123`. Demo customer: `demo@bowclips.com` / `demo123`.

## Hard rules — do not violate
1. **Money is integer BDT.** Never use floats/decimals for currency anywhere.
2. **The server is the source of truth for pricing.** Order totals (subtotal,
   discount, shipping, total) are recomputed server-side in
   `backend/src/routes/orders.ts`. Never move price/total calculation to the
   client or trust client-sent amounts.
3. **`costPrice` (Product) must never appear in any public API response.** It is
   admin-only, used for profit reports. Keep it out of public serializers
   (`backend/src/lib/serialize.ts`).
4. **Permission checks stay server-side.** Admin/staff access is enforced by
   `requireStaff` + `checkPermission` in middleware, not just hidden in the UI.
   Staff have a `permissions` array; admins bypass.
5. **SQLite has no array/JSON columns.** Arrays are stored as JSON **strings**
   (`colors, sizes, gallery, timeline, permissions`, review `images`) and parsed
   by serializers. Keep new array-ish fields as `String @default("[]")` for
   SQLite compatibility, parsed in the serializer.
6. **Keep the dev-fallback pattern.** When adding/extending an integration, if
   credentials are missing it must degrade gracefully (console log / mock), never
   crash a request. See `lib/mailer.ts`, `lib/whatsapp.ts`, `lib/courier.ts`.
7. **JWT auth** via `Authorization: Bearer <token>`. `requireAdmin` reads the role
   from the DB (not just the token claim) to survive stale tokens.

## Windows dev note
Prisma's query-engine DLL is locked while the dev server runs. If
`prisma:push`/`prisma:generate` fails with `EPERM`, stop Node first
(`taskkill /F /IM node.exe`), run the Prisma command, then restart `npm run dev`.

## Current work / priorities (as of July 2026)
1. **SSLCommerz payment gateway — NOT yet integrated. Primary build task.**
   Checkout currently supports `cod | bkash | nagad` with a manual `txnId` only.
   Build the SSLCommerz hosted-checkout flow: Session API → redirect → success/
   fail/cancel + **IPN** callbacks → **server-side transaction validation**
   before marking an order paid. Hook point: `POST /orders` in
   `backend/src/routes/orders.ts`. Details in the handoff doc §7.1.
2. Add live credentials for WhatsApp, SMTP email, couriers, and social login
   (all already wired — just need env vars).
3. Real API calls for Pathao & RedX couriers (Steadfast is done in `lib/courier.ts`).
4. **Product variants as real SKUs** — deliberately deferred; rewires the
   pricing/stock/checkout path. Coordinate before starting.

## Going to production (summary)
Switch Prisma provider to `postgresql` + real migrations; set a strong
`JWT_SECRET`; tighten CORS in `app.ts` to the real origin (dev allows any
localhost); move `backend/uploads/` off local disk (S3/Cloudinary) on ephemeral
hosts; register HTTPS callback/redirect URLs for SSLCommerz and OAuth.

---
Full walkthrough (env vars, full API table, data model, test plan):
**`proposal/Backend-Developer-Handoff.md`**.
