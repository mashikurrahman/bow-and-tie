# Bow &amp; Tie — Launch Cost Sheet &amp; Go-Live Checklist

*Handcrafted hair accessories · Dhaka, Bangladesh · prepared 13 July 2026*

This document lists everything needed to take **bowandtie** officially live, what
each item costs, and a step-by-step tick-box checklist. Costs are approximate —
BDT first, USD in brackets (~৳120 = $1). Free-tier services are marked **Free**.

---

## Part 1 — Cost breakdown

### 1. Technical (running the website)

| Item | Service | Cost | Notes |
|---|---|---|---|
| Frontend hosting | Cloudflare Pages / Vercel | **Free** | Cloudflare Pages best for a commercial store |
| Backend API | Render (free) | **Free** | Sleeps after 15 min idle → keep awake with a free pinger |
| Backend upgrade *(optional)* | Render Starter | **~৳840/mo ($7)** | Removes cold-starts — worth it once orders arrive |
| Database | Neon Postgres (free) | **Free** | 0.5 GB — plenty for a boutique |
| Image storage | Cloudflare R2 (free) | **Free** | 10 GB, no bandwidth fees (card required, not charged) |
| Email | Brevo (free) | **Free** | 300 emails/day |
| SSL / HTTPS | Let&#39;s Encrypt (automatic) | **Free** | Included by all hosts |
| Uptime pinger | UptimeRobot | **Free** | Stops the free backend sleeping |
| **Domain name** | Namecheap `.com` | **~৳1,300/yr ($11)** | Or `.com.bd` via BTCL ~৳800–2,000/yr |

**Technical cost to go live: ~৳1,300/year — just the domain. Everything else is free.**

### 2. Login, social &amp; messaging APIs (all free)

| Item | Cost | Status in your store | Notes |
|---|---|---|---|
| **Google Sign-In** (OAuth) | **Free** | Live | Just a free Google Cloud project — no billing card, no per-user charge at any scale |
| **Facebook Login** (OAuth) | **Free** | Coded, off (Google-only chosen) | Needs a free Meta developer app; enable anytime |
| **WhatsApp Cloud API** (Meta) | **Free tier** | Coded, paused | Service replies free; only paid template/marketing messages cost (optional) |
| Facebook / Instagram page &amp; Shop | **Free** | — | Organic selling / traffic channel |
| Google Analytics *(optional)* | **Free** | — | Traffic &amp; sales insights |

**All login and API integrations are free.** The only Meta-related cost is optional
paid advertising (see §5). Google/Facebook charge nothing for authentication.

### 3. Business accounts (for taking payments)

| Item | Cost | Required for | Notes |
|---|---|---|---|
| bKash **Merchant** account | **Free signup** | Accepting bKash properly | ~1.5–1.85% per cash-out |
| **TIN** (Tax ID, NBR) | **Free** | Only if you later add SSLCommerz | Apply online at NBR |
| Business bank account | **Free–low** | SSLCommerz settlement (later) | Some banks need a minimum balance |
| Trademark (brand name) *(optional)* | **~৳4,000+** | Protecting the "Bow &amp; Tie" name | Not required to launch |

**These are all free (or optional). Note: an automated SSLCommerz account later
requires a trade license — but you don&#39;t need one to launch on COD + manual bKash.**

### 4. Payment &amp; delivery (pay only when you sell — no upfront cost)

| Item | Cost | Notes |
|---|---|---|
| **Cash on Delivery + manual bKash/Nagad** | **Free** | Already built — you can launch on this today |
| SSLCommerz (automated checkout) | **No monthly fee; ~2.5–3% per transaction** | Needs trade license + bank + TIN. Add later. |
| Courier (Pathao / Steadfast / RedX) | **~৳60–130 per parcel** | Free signup; usually charged to the customer as shipping |

### 5. Optional / growth (not needed to launch)

| Item | Cost | Notes |
|---|---|---|
| Render Starter (no cold-start) | ~৳840/mo | Recommended once orders come in |
| Facebook / Instagram ads | Your budget | Main growth lever for a boutique |
| Professional logo / branding | ~৳2,000–10,000 one-time | Optional |
| Custom email (`hello@bowandtie.com`) | Free (Cloudflare/Zoho free tier) | Nice for professionalism |

---

## Part 2 — Three budget scenarios

| Scenario | What you get | First-year cost | Monthly |
|---|---|---|---|
| 🟢 **A — Absolute minimum** | Free stack + free subdomain + COD/manual bKash | **৳0** | **৳0** |
| 🔵 **B — Recommended launch** ⭐ | Everything in A **+ your own domain** | **~৳1,300** (domain only) | **৳0** |
| 🟣 **C — Smooth, sales-ready** | Everything in B **+ Render Starter + SSLCommerz** | **~৳11,400** | **~৳840** + 2.5–3% on gateway sales |

**Bottom line:** you can be live and taking real orders for **the price of a domain
(~৳1,300/year)** — everything else in the launch stack is free. Payments and courier
cost nothing upfront; they are per-sale and mostly passed to the customer.

---

## Part 3 — Go-live checklist

Work top to bottom. Nothing here has a monthly cost unless noted.

### Phase 1 — Business accounts

- ☐ Register / upgrade a **bKash Merchant** account for taking payments
- ☐ *(Only for SSLCommerz later)* Get a free **TIN** and confirm a **business bank account**

### Phase 2 — Infrastructure (all free)

- ☐ Confirm the site is deployed: **Vercel/Cloudflare** (frontend) + **Render** (backend) + **Neon** (database)
- ☐ Set up **Cloudflare R2** and add the 5 env vars on Render *(so product images survive redeploys — see DEPLOY.md)*
- ☐ Set **`ADMIN_EMAIL`** and **`ADMIN_PASSWORD`** on Render *(stop using the demo `admin123`)*
- ☐ Add a free **UptimeRobot** monitor hitting `/api/health` every 10 min *(stops the backend sleeping)*
- ☐ Confirm **Brevo** email is sending (order confirmations, verification)

### Phase 3 — Domain &amp; branding (~৳1,300/yr)

- ☐ Buy a **domain** (Namecheap `.com` or `.com.bd`)
- ☐ Point the domain&#39;s DNS at the frontend host
- ☐ Update backend **`CORS_ORIGIN`** and **`APP_URL`** to the new domain
- ☐ Add the new domain to **Google OAuth** authorised origins
- ☐ *(Optional)* Set up a free custom email like `hello@bowandtie.com`

### Phase 4 — Products &amp; content

- ☐ Fill in the **product import Excel template** (`product-import/` folder)
- ☐ Bulk-import products via **Admin → Products → Import**
- ☐ Upload product images *(safe now that R2 is on)*
- ☐ Review categories, prices, stock, and descriptions
- ☐ Set up any launch **coupons / promotions**

### Phase 5 — Payments &amp; delivery

- ☐ Launch with **Cash on Delivery + manual bKash/Nagad** *(already built — $0)*
- ☐ Sign up with a **courier** (Pathao / Steadfast / RedX) and add credentials
- ☐ *(Later)* Apply for **SSLCommerz** once the trade license is ready, for automated checkout

### Phase 6 — Final checks before announcing

- ☐ Place a **real test order** end-to-end and confirm the email + admin alert
- ☐ Check the site on **mobile** (most customers shop on phones)
- ☐ Verify **shipping rates** (inside vs outside Dhaka) and free-shipping threshold
- ☐ Add store **policies**: returns, delivery time, contact info
- ☐ Connect **Facebook / Instagram** and prepare launch posts

### Phase 7 — Grow (optional, after launch)

- ☐ Upgrade to **Render Starter** (~৳840/mo) to remove cold-starts
- ☐ Enable **SSLCommerz** automated payments
- ☐ Start **Facebook/Instagram ads**
- ☐ Set up **WhatsApp** order alerts / customer messages (free tier)
- ☐ *(Optional)* Enable **Facebook Login** alongside Google (both free)

---

*Free stack: Cloudflare Pages · Render · Neon · Cloudflare R2 · Brevo · UptimeRobot.
The only fixed cost to go live is a domain (~৳1,300/year).*
