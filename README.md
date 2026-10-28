# Auto shop website with online booking

A production-ready website for a car repair shop: three languages (Estonian, Russian, English),
a booking system based on time slots that the owner opens manually, instant email notifications
with one-tap Confirm / Decline, and a phone-friendly admin panel.

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · Supabase (Postgres + Auth) · Resend · Vercel

---

## Contents

1. [What's inside](#whats-inside)
2. [Rebrand in minutes — the config file](#rebrand-in-minutes)
3. [Local setup](#local-setup)
4. [Supabase setup](#supabase-setup)
5. [Resend setup (emails)](#resend-setup)
6. [Environment variables](#environment-variables)
7. [Deploy to Vercel](#deploy-to-vercel)
8. [How booking works](#how-booking-works)
9. [Admin panel](#admin-panel)
10. [Tests](#tests)
11. [Project structure](#project-structure)
12. [Owner checklist](#owner-checklist)

---

## What's inside

**Public site** — `/et` (default), `/ru`, `/en`
- Home: hero with *Book now*, trust points, service cards, how it works, reviews, map, contact CTA
- Services with duration, "from" price and *Book this service* (preselects it)
- About (story, team, equipment), Contact (click-to-call, map, hours), Privacy policy (GDPR, Estonia)
- Booking wizard: services → calendar (only bookable days are clickable) → car details → contact
- Booking status page with secure cancel link
- Sticky *Call / Book now* bar on phones, localized 404, loading and error states
- Language switcher; `/` redirects by browser language (remembers the choice)

**Booking engine**
- Only slots the admin published can be booked — nothing is generated from opening hours
- Longer services take several consecutive slots in the same bay; only start times with enough room are shown
- Double booking is impossible: one Postgres transaction locks the slots, checks they are free, creates the booking
- If two people click the same time, the second gets *"This time was just taken"* and fresh times
- No free time at all → *"Leave your phone, we will call you"* form (stored + admin email)
- zod validation in the browser and on the server, honeypot field, database-backed rate limiting
- Customers can cancel online until 3 h before the visit (configurable); the slot becomes free again

**Notifications** (Resend)
- Admin email immediately on: new booking, cancellation by client, callback request — with all client data, tap-to-call, and one-time **Confirm** / **Decline** buttons that work without logging in
- Client emails in the language they booked in: confirmation (+ cancel link), confirmed, declined (+ link to rebook), cancelled
- Sent after the response with 3 retries; failures are logged and shown as a red banner in admin. A booking is never lost because of email.

**Admin** — `/admin` (Supabase Auth, fully usable on a phone)
- Availability calendar (month + week): add slots for a day, bulk add (*every Mon–Fri 09–17, 60 min, lunch break, N bays, for 4 weeks*), copy a day or week, block / delete slots, close a day in one tap
- Bookings: filters, search, unread highlight, full client data and message, status changes, notes, call button, manual booking for phone calls
- Callback requests, services editor (3 languages), notification settings with *Send test email*, notification log, simple stats
- Live badge + chime when a new booking arrives while the panel is open

**SEO** — LocalBusiness + AutoRepair JSON-LD, `sitemap.xml` with hreflang, `robots.txt`, per-language titles/descriptions/OG images, canonical + hreflang links, manifest and icons. Pages are prerendered static HTML (fast, Lighthouse-friendly). GA4 / Meta Pixel load only after cookie consent and only if their env IDs are set.

---

## Rebrand in minutes

Everything about the business lives in **`src/config/site.ts`**:

| What | Where in `siteConfig` |
| --- | --- |
| Name, legal name, registry / VAT code | `name`, `legalName`, `registryCode`, `vatNumber` |
| Phone, email | `contact` |
| Address, city ("in Narva" per language), map coordinates | `address` |
| Opening hours | `hours` |
| Trust numbers (years, warranty, rating) | `trust` |
| Services: name & description ×3 languages, duration, "from" price, icon | `services` |
| Team, reviews | `team`, `reviews` |
| Photos | `images` → files in `public/images/` |
| Cancel window, how far ahead customers can book, link expiry | `booking` |
| Admin email language default | `adminLang` |

Other places you may want to touch:
- **Texts** — `src/i18n/dictionaries/{et,ru,en}.ts` (site) and `src/i18n/admin/{ru,et,en}.ts` (admin + admin emails). TypeScript fails the build if a language misses a key.
- **Colors** — `src/app/globals.css`, the `--color-accent-*` tokens (orange by default; an electric-blue alternative is in the comment).
- **Photos** — replace `public/images/hero.svg`, `workshop.svg`, `equipment.svg` (or point `images` to `.jpg`/`.webp` files; they are optimized automatically).

After changing services in the config, run `npm run db:seed` to regenerate `supabase/seed.sql`. Once the site is live, edit services in **/admin → Services** (the database version is what the site shows).

---

## Local setup

Requirements: Node.js 20.9+ and a Supabase project (free tier is fine).

```bash
npm install
cp .env.example .env.local      # fill in the values (see below)
npm run dev                     # http://localhost:3000
```

Without Supabase variables the public pages still render (services come from the config file), but booking and admin need the database.

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com) — choose an **EU region** (e.g. Frankfurt) for GDPR.
2. **Create the database schema.** Either:
   - **SQL editor:** open *SQL Editor*, paste and run `supabase/migrations/20261028000000_init.sql`, then `supabase/seed.sql`; or
   - **CLI:** `npx supabase init` (once), `npx supabase link --project-ref <ref>`, `npx supabase db push`, then run `supabase/seed.sql` in the SQL editor.

   The seed adds the services and example slots for the next 2 weeks (Mon–Fri 09–17, 2 bays, lunch 12–13; Sat 09–13).
3. **Create the owner login:** *Authentication → Users → Add user* (email + password, "Auto confirm"). Then allow it into the admin panel (SQL editor):
   ```sql
   insert into public.admins (email) values ('owner@your-domain.ee');
   ```
   Add more rows for more admins. Signed-in users that are not in this table cannot use `/admin`.
4. *Authentication → Providers → Email*: you can turn **off** "Allow new users to sign up" — the owner account is created by hand.
5. Copy keys from *Project Settings → API* into your env: Project URL, `anon` (publishable) key, `service_role` (secret) key. The new `sb_publishable_…` / `sb_secret_…` keys work the same way.

**Security model:** Row Level Security is on for every table. The public (anon key) can read only active services and *free* slots (date/time columns only). Bookings, callbacks and the rate limiter go through server routes that validate input and call database functions with the service key. Everything else is readable/writable only by users listed in `admins`.

---

## Resend setup

1. Sign up at [resend.com](https://resend.com).
2. *Domains → Add domain* — add your shop domain (e.g. `example.ee`) and create the DNS records Resend shows (SPF/DKIM, optionally DMARC) at your domain registrar. Wait until it shows **Verified**.
3. *API Keys → Create* → copy into `RESEND_API_KEY`.
4. Set `EMAIL_FROM` to an address on the verified domain, e.g. `Graphite Auto <booking@example.ee>`.
5. Set `NOTIFY_EMAILS` (comma separated) — or set recipients later in **/admin → Settings**, then press **Send test email**.

Without `RESEND_API_KEY` nothing is sent; every notification is still written to the log (status *skipped*) so you can test safely.

---

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | yes | Public URL, used in emails, sitemap, canonical links |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public (anon / publishable) key |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only secret key — never expose |
| `RESEND_API_KEY` | for email | Resend API key |
| `EMAIL_FROM` | for email | Sender on a verified domain |
| `NOTIFY_EMAILS` | for email | Admin recipients (comma separated); admin Settings override it |
| `NEXT_PUBLIC_GA_ID` | no | Google Analytics 4 ID (loads after consent) |
| `NEXT_PUBLIC_META_PIXEL_ID` | no | Meta Pixel ID (loads after consent) |
| `IP_HASH_SALT` | no | Salt for hashed IPs in rate limiting |
| `RATE_LIMIT_*` | no | Override rate limits (see `.env.example`) |

---

## Deploy to Vercel

1. Push this repository to GitHub.
2. In Vercel: *Add New → Project* → import the repo (framework: Next.js, no build settings to change).
3. Add the environment variables above (Production + Preview).
4. Deploy. Then *Settings → Domains* → add your domain and set the DNS records Vercel shows.
5. Set `NEXT_PUBLIC_SITE_URL` to the final domain and redeploy.
6. Optional: submit `https://your-domain/sitemap.xml` in Google Search Console and create a Google Business Profile with the same name/address/phone as the config.

`vercel.json` pins functions to Frankfurt (`fra1`), close to an EU Supabase region.

---

## How booking works

- A **slot** is a row: date, start, end, bay, status (`free` / `booked` / `blocked`). Only the admin creates slots.
- Service durations add up (oil change 45 min + brakes 120 min = 165 min). A start time is offered only if consecutive free slots **in the same bay** cover that duration — no jumping over the lunch break or past closing time.
- Booking is the Postgres function `create_booking`: it locks the slot chain with `SELECT … FOR UPDATE` (always in the same order, so no deadlocks), re-checks the slots are free, inserts the booking and marks the slots booked — all in one transaction. A concurrent request waits for the lock, then sees the slot as booked and gets `slot_taken`.
- An exclusion constraint makes overlapping slots in one bay impossible at the database level.
- Cancelling (customer link, admin, or Decline link) frees the slots in the same transaction.
- Confirm/Decline links in admin emails are random 48-hex tokens; only their SHA-256 hash is stored. They expire (72 h by default), work once, and using one disables its pair. The link opens a page with one button, so email link scanners cannot trigger the action by just visiting it.

---

## Admin panel

Open `/admin`, sign in with the owner account.

- **Slots** — tap a day → *Add slots* (start, end, slot length 30/45/60/90/120, parallel bays, lunch break). *Bulk* creates a weekly pattern for up to 12 weeks. *Copy* copies a day to chosen dates or a week to the next N weeks. Tap a slot to block/unblock/delete it, or open its booking. *Close day* blocks all free slots at once.
- **Bookings** — new bookings are highlighted; opening one marks it read. Confirm / Done / No-show / Cancel (cancel frees the time and emails the client). Notes are internal. *Add booking* is for phone calls.
- **Settings** — notification recipients and language, test email, notification log. Failed emails show a red banner until acknowledged.
- The admin UI language (RU / ET / EN) is switchable per device.

---

## Tests

```bash
npm run typecheck && npm run lint
npm run test:e2e        # builds the app and runs all tests on a local stack
```

`test:e2e` needs a local PostgreSQL 16 server (`/usr/lib/postgresql/16/bin`) and the Playwright Chromium browser. It starts a throwaway Postgres, applies the real migration + seed, runs **test-only** mocks of the Supabase REST/Auth API and of the Resend API (`scripts/test/mock-services.mjs` — never deployed), then runs:

- `tests/sql/` — RLS, consecutive-slot logic, a 20-connection race for one slot, cancellation, one-time tokens, overlap constraint, rate limiter
- `tests/e2e/booking.e2e.test.mjs` — booking API, a 12-request HTTP race (exactly one wins), admin email content (every client field, escaping, links), Confirm/Decline links in a real browser, client emails per language, cancellation freeing the slot, callback email, honeypot/validation, email outage (booking still saved, failure logged)
- `tests/e2e/ui.e2e.test.mjs` — the 4-step wizard and cancel page at 375 px, language detection, admin login/slots/confirm, non-admin lockout

---

## Project structure

```
src/
  config/site.ts            ← all business data
  i18n/                     ← site + admin translations
  app/
    [lang]/                 ← public site (et/ru/en): pages, OG image, 404
    admin/                  ← admin panel, server actions, one-time action links
    api/                    ← availability, bookings, cancel, callback
    sitemap.ts robots.ts manifest.ts icon.svg
  components/{site,booking,admin}/
  lib/                      ← booking logic, availability, email, validation, SEO
  proxy.ts                  ← language redirect + admin session refresh
supabase/
  migrations/               ← schema, RLS, booking functions
  seed.sql                  ← generated by `npm run db:seed`
scripts/ tests/             ← seed generator, local test stack, tests
```

---

## Owner checklist

Fill in before going live:

- [ ] `src/config/site.ts`: shop name, legal name, registry & VAT code, phone, email, address, map coordinates, opening hours, founding year, trust numbers
- [ ] Services: final names, descriptions, durations, "from" prices (config → `npm run db:seed`, or later in admin)
- [ ] Real photos in `public/images/` (hero, workshop, equipment), team names, real reviews (with permission)
- [ ] Privacy policy text reviewed (`privacy` section in the dictionaries) — data processors, retention periods
- [ ] Domain bought and connected in Vercel; `NEXT_PUBLIC_SITE_URL` set
- [ ] Supabase project (EU), migration + seed run, owner user created and added to `admins`
- [ ] Resend domain verified, `RESEND_API_KEY`, `EMAIL_FROM`, notification emails set; test email received
- [ ] Open real slots in **/admin → Slots** (the seed only adds 2 example weeks)
- [ ] Optional: GA4 / Meta Pixel IDs, Google Business Profile, Search Console
