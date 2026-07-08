# Bow Clips & Hair Accessories — Full-Stack E-commerce

A complete boutique e-commerce store: a React storefront (`frontend/`) backed by a
Node + Express + Prisma API with a real database (`backend/`).

```
Bow and Tie/
├── frontend/     # Vite + React + TypeScript storefront (customer-facing + future /admin)
├── backend/      # Node + Express + Prisma REST API + database
├── docker-compose.yml   # optional local PostgreSQL
└── README.md
```

## Quick start (2 terminals)

**1. Backend**
```bash
cd backend
npm install
npm run prisma:generate     # generate the Prisma client
npm run prisma:push         # create the database schema (SQLite by default)
npm run seed                # load products, promos & demo accounts
npm run dev                 # API on http://localhost:4000
```

**2. Frontend**
```bash
cd frontend
npm install
npm run dev                 # storefront on http://localhost:5173
```

### Demo accounts (created by the seed)
| Role     | Email                | Password |
|----------|----------------------|----------|
| Admin    | admin@bowclips.com   | admin123 |
| Customer | demo@bowclips.com    | demo123  |

## What works end-to-end
- Browse catalog, search, filter, product galleries, wishlist, cart (localStorage)
- **Register / login** with hashed passwords + JWT sessions (restored on reload)
- **Checkout** — server recomputes prices, promo discount, shipping & total (never trusts the client), decrements stock
- **Order history, order detail with status timeline, public order tracking**
- **Account** — profile + saved addresses (prefill at checkout)
- Guest checkout + WhatsApp ordering

## Database

Local development uses **SQLite** (zero install — a `backend/prisma/dev.db` file) so it
runs immediately. The code is database-agnostic through Prisma.

### Switching to PostgreSQL (production)
1. Start Postgres — either `docker compose up -d` (from repo root) or use a free
   cloud Postgres such as [Neon](https://neon.tech) / [Railway](https://railway.app).
2. In `backend/prisma/schema.prisma`, set the datasource provider:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. In `backend/.env`, set your connection string:
   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bowandtie?schema=public"
   ```
4. Run `npm run prisma:migrate && npm run seed`.

No application code changes are needed.

## API overview
```
GET    /api/health
POST   /api/auth/register          POST /api/auth/login          GET /api/auth/me
GET    /api/products               GET  /api/products/:id
POST   /api/orders                 GET  /api/orders/mine
GET    /api/orders/:id             GET  /api/orders/track/:id
PUT    /api/account/profile
POST   /api/account/addresses      DELETE /api/account/addresses/:id
```

## Admin panel (built)
Log in as the seeded admin (`admin@bowclips.com / admin123`) and open **/admin**
(or the "Admin Panel" tile on your account). The panel is code-split, so shoppers
never download it. It follows the "Culters" dashboard design and includes:
- **Dashboard** — Total Revenue, **Net Profit** (revenue − COGS − discounts), Total
  Customers, Avg Order Value, a sales-over-time chart, low-stock alerts, popular
  products and recent orders.
- **Products** — full CRUD with a live **image uploader** (stored under `backend/uploads`),
  cost price, stock, colors/sizes, and profit-margin display. Edits appear on the
  storefront immediately (the shop reads the catalog from the API).
- **Orders** — status tabs (Processing → Delivered / Cancelled) with inline status
  updates and payment/status pills.
- **Customers** — list with order counts and total spend.
- **Settings** — admin profile + change password (Account / Security tabs).

Admin endpoints live under `/api/admin/*` and `/api/admin/upload`, all guarded by the
`admin` role.

### Roadmap (future)
Invoices/refunds, promo-code management UI, deeper reports, courier integration
(Pathao/Steadfast/RedX), bKash/Nagad reconciliation, and multi-role staff access.

## Production notes
- Set a strong `JWT_SECRET` and lock `CORS_ORIGIN` to your real domain in `backend/.env`.
- Replace the WhatsApp number in `frontend/src/data.ts` and the bKash/Nagad merchant
  number in the checkout page.
- Deploy frontend (Vercel/Netlify) + backend (Railway/Render/Fly) + managed Postgres.
