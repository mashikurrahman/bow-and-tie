# Deploying Bow & Tie to a free staging server

This gets the store live on a public HTTPS URL so you can test the paid
integrations (SSLCommerz, WhatsApp, couriers) the way they'll behave in
production. Those services call **back** to your server, so they need a real
URL — localhost won't work. That's the whole reason we stage first.

## The free stack

| Piece | Host | Free tier notes |
|-------|------|-----------------|
| Database (PostgreSQL) | **Neon** | Always-available, ~0.5 GB, doesn't expire. |
| Backend API (Express) | **Render** | Free web service, public HTTPS. **Sleeps after ~15 min idle** (first request then wakes in ~50 s). |
| Storefront (Vite) | **Vercel** | Free static hosting, instant, HTTPS. |

All three deploy from your existing GitHub repo (`mashikurrahman/bow-and-tie`).
Total cost: **$0**.

> The repo is already prepared for this: Postgres provider, `prisma generate`
> on install, `deploy:db` script, `render.yaml`, `frontend/vercel.json`, a
> `/api/health` check, and env-driven admin credentials.

---

## Step 1 — Database (Neon)

1. Sign up at **neon.tech** (log in with GitHub).
2. **Create project** → name it `bow-and-tie`, pick the region closest to you
   (Singapore is nearest to Bangladesh).
3. On the project dashboard, copy the **connection string** (the "pooled"
   connection is fine). It looks like:
   ```
   postgresql://user:pass@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
   Keep this — it's your `DATABASE_URL`.

---

## Step 2 — Backend API (Render)

1. Sign up at **render.com** (log in with GitHub).
2. **New → Web Service** → connect the `bow-and-tie` repo.
3. Settings (most are picked up from `render.yaml`, but confirm):
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run deploy:db`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
   - **Instance Type:** Free
4. Add **Environment Variables** (Environment tab):

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | *(the Neon string from Step 1)* |
   | `JWT_SECRET` | *a long random string* (e.g. run `openssl rand -hex 32`) |
   | `CORS_ORIGIN` | *(fill in after Step 3 — your Vercel URL)* |
   | `APP_URL` | *(same Vercel URL)* |
   | `PUBLIC_URL` | *(your Render URL, e.g. `https://bow-and-tie-api.onrender.com`)* |
   | `ADMIN_EMAIL` | *your real admin email* |
   | `ADMIN_PASSWORD` | *a strong password* (this replaces the demo login) |

   You can leave `CORS_ORIGIN`/`APP_URL` blank for now and set them in Step 4.
5. **Create Web Service.** The build runs `prisma db push` (creates the tables
   on Neon) and seeds products + your admin user. Watch the logs for
   `Seed complete`.
6. Note your backend URL: `https://<name>.onrender.com`. Check it's alive:
   open `https://<name>.onrender.com/api/health` → `{"ok":true,...}`.

---

## Step 3 — Storefront (Vercel)

1. Sign up at **vercel.com** (log in with GitHub).
2. **Add New → Project** → import the `bow-and-tie` repo.
3. Settings:
   - **Root Directory:** `frontend`
   - Framework preset: **Vite** (auto-detected). Build/output are auto.
4. Add **Environment Variable**:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://<your-render-app>.onrender.com/api` |

   *(Note the `/api` suffix — the frontend calls `${VITE_API_URL}/products` etc.)*
   If you use Google login later, also add `VITE_GOOGLE_CLIENT_ID`.
5. **Deploy.** Note your storefront URL: `https://<name>.vercel.app`.

---

## Step 4 — Connect the two

Now that you know the Vercel URL, tell the backend to trust it:

1. Back in **Render → Environment**, set:
   - `CORS_ORIGIN` = `https://<name>.vercel.app`
   - `APP_URL` = `https://<name>.vercel.app`
2. Save — Render redeploys automatically.

CORS is locked in production, so the storefront **must** match `CORS_ORIGIN`
exactly (no trailing slash) or the browser will block API calls.

---

## Step 5 — Verify it works

Open your Vercel URL and check:
- [ ] Products load on the shop page (proves frontend → backend → Neon works).
- [ ] Log in to `/admin` with your `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- [ ] Place a test order (COD) → it appears in Admin → Orders.
- [ ] `https://<render>.onrender.com/api/health` returns ok.

---

## Enabling email (Brevo) + Google login

The store works without these, but customer email verification and social login
need them configured. All values go in **Render → Settings → Environment** (the
`VITE_*` ones go in **Vercel → Settings → Environment Variables**), then redeploy.

### Transactional email — Brevo (free 300/day)

1. Sign up at **brevo.com** → verify your account.
2. Go to **SMTP & API → SMTP**. Note the server, port, login, and generate an
   **SMTP key** (this is the password — not your Brevo login password).
3. Add these on **Render**:

   | Key | Value |
   |-----|-------|
   | `SMTP_HOST` | `smtp-relay.brevo.com` |
   | `SMTP_PORT` | `587` |
   | `SMTP_USER` | *your Brevo SMTP login (an email-looking string)* |
   | `SMTP_PASS` | *the Brevo SMTP key* |
   | `EMAIL_FROM` | `Bow & Tie <no-reply@yourdomain.com>` *(or your verified Brevo sender)* |

   Until these are set, emails just print to the Render logs (nothing is sent).
   Verification uses **soft** mode, so customers can still shop meanwhile — they
   just see a "verify your email" banner.

### Google login (free)

1. Go to **console.cloud.google.com** → create a project (or reuse one).
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - If prompted, configure the **OAuth consent screen** (External, add your
     email, app name "Bow & Tie") — you can leave it in "Testing".
   - Application type: **Web application**.
   - **Authorized JavaScript origins** — add your Vercel URL exactly:
     `https://bow-and-ties.vercel.app`
   - (No redirect URI needed — we use Google Identity Services.)
3. Copy the **Client ID** (ends in `.apps.googleusercontent.com`).
4. Set it in **both** places:

   | Where | Key | Value |
   |-------|-----|-------|
   | Vercel | `VITE_GOOGLE_CLIENT_ID` | *the client ID* |
   | Render | `GOOGLE_CLIENT_ID` | *the same client ID* |

5. Redeploy both. The "Continue with Google" button appears automatically, and
   Google users are auto-verified (no email step).

## Known limits of the free tier (fine for staging)

- **Render sleeps after ~15 min idle.** The first request wakes it (~50 s).
  For a webhook test this can look like a timeout. Two options while testing:
  - Just load the site once to wake it right before you test an integration, or
  - Keep it warm with a free pinger: **cron-job.org** or **UptimeRobot** hitting
    `/api/health` every 10 min during your testing window.
- **Uploaded images are ephemeral.** Product/review photos saved on Render's
  free disk are wiped on each redeploy/restart. Re-upload as needed on staging;
  moving to object storage (Cloudflare R2 / S3) is a production task.
- **Neon compute autosuspends** after inactivity but resumes in ~1 s on the next
  query — no action needed.

---

## URLs you'll need for the integrations (later)

Once staging is live, these are the callback/webhook URLs to register with each
provider. `API` = your Render backend URL.

| Integration | URL to register | Notes |
|-------------|-----------------|-------|
| SSLCommerz | `API/api/payments/sslcommerz/ipn` *(to be built)* | Success/fail/IPN callbacks. Needs HTTPS — staging provides it. |
| WhatsApp (Meta Cloud API) | `API/api/whatsapp/webhook` *(to be built)* | Webhook verify + inbound messages. |
| Couriers (Pathao/RedX) | Set merchant API keys as env vars | Mostly outbound; some send delivery-status webhooks. |

We'll wire each of these after staging is confirmed working.

---

## Local development after the Postgres switch

The app no longer uses SQLite. For local dev, point `backend/.env`'s
`DATABASE_URL` at a Postgres database — easiest options:

- **Reuse Neon:** create a second Neon **branch** (e.g. `dev`) and use its
  connection string locally, keeping staging data separate. *(No install.)*
- **Local Docker:** `docker compose up -d` (uses the included
  `docker-compose.yml`), then
  `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bowandtie?schema=public"`.

Then sync + seed once:
```
cd backend
npm install
npm run deploy:db     # prisma db push + seed
npm run dev
```
