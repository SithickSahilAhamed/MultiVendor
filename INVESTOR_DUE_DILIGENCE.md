# Investor Technical Due Diligence — Sunfara Marketplace

**Role:** venture capitalist performing technical due diligence on a $1M ask.
**Basis:** direct inspection of the live production codebase and Firestore data model, plus this session's hostile-testing pass (`HOSTILE_TESTING_AUDIT.md`) and two prior audits (`PRODUCTION_READINESS_AUDIT.md`, `MARKETPLACE_READINESS_AUDIT.md`) — not a pitch deck, not a demo.

---

## Would I invest? No — not at this stage, not at this valuation implied by a $1M ask on pre-revenue infrastructure.

**Why:** what exists today is a genuinely real, working multi-vendor transaction engine — that part is no longer in question, it's been built and live-verified this session (checkout splits correctly by vendor, commissions calculate correctly, refunds reverse correctly, order state machine is sound). But a marketplace's defensibility is never the CRUD; it's trust infrastructure — fraud controls, dispute resolution, seller vetting, financial reconciliation, and the operational tooling to run the business without an engineer on call 24/7. None of that exists yet. I'd revisit after: (1) a live pilot with 10-20 real vendors and real transactions for 60-90 days, (2) the Critical/High findings in the hostile-testing audit closed, (3) evidence of unit economics (real commission revenue vs. real payment-processing + hosting cost) rather than modeled ones.

---

## Top 20 Risks

1. **A suspended vendor can still transact.** `AdminController`'s vendor-suspend action writes a Firestore field; it never revokes the vendor's auth token or gates a single downstream endpoint on that status. This is the single most dangerous finding for a marketplace specifically — the one enforcement mechanism a marketplace absolutely must have (kick a bad actor out *now*) doesn't work.
2. **Cancelling a paid order doesn't refund the customer or reverse the vendor's commission.** Confirmed money leak, silent, no alert.
3. **Stock is locked at checkout, before payment, with no release job.** Under real cart-abandonment rates this makes popular products falsely show out-of-stock indefinitely.
4. **No webhook fallback for payment confirmation** — a real Razorpay payment was captured live tonight while the app's own database still showed "pending," because confirmation depends entirely on a client-side JS callback firing. Any dropped connection at the wrong instant produces a customer who paid and an order that says they didn't.
5. **This Razorpay account cannot process refunds** (confirmed live — even a bare-minimum refund request is rejected by Razorpay's API itself, independent of app code). A marketplace with no working refund rail is not launch-ready by definition, regardless of code quality.
6. **Products go public before admin approval**, contradicting the app's own Firestore security rules, which were clearly written with moderation in mind. For a wellness/skincare category, unreviewed listings are a real regulatory exposure, not just a UX nit.
7. **Withdrawal requests have a race condition** that can let a vendor double-request against the same balance.
8. **No pagination anywhere** — every list endpoint caps at a hardcoded limit (100-500) with no offset/cursor support. At 1,000+ vendors or 10,000+ products, large parts of the admin and vendor dashboards silently stop showing data with no error.
9. **Systemic unescaped HTML rendering (stored XSS)** across product names, vendor names, reviews, and (until tonight) the new return-reason field — confirmed live in code written this session, and confirmed present in the pre-existing codebase by the same pattern.
10. **No rate limiting at the application layer** on checkout, registration, or withdrawal endpoints.
11. **No reconciliation tool.** The platform-revenue aggregate is hand-maintained by application code with no way for a non-engineer to detect or correct drift from the transaction ledger — and it *did* drift, live, tonight (by exactly one uncorrected refund).
12. **Coupons are UI-only** — no server-side discount calculation exists, meaning any coupon feature that ships today either double-charges customers relative to what they were shown, or has to be built from scratch.
13. **No seller vetting/KYC process** beyond an email+phone signup form. Fake inventory, counterfeit goods, and mislabeled claims are entirely unguarded.
14. **Swagger/API docs are public in production**, handing anyone a complete map of the API surface.
15. **Single points of manual-recovery failure.** The one time a refund failed live tonight, the only way to unstick it was a hand-written Firestore script run by an engineer — there is no admin UI action for "retry this failed operation" anywhere yet (this specific instance was fixed tonight; the pattern of "external call fails mid-pipeline, no recovery state" should be assumed to exist elsewhere until audited).
16. **No notifications system** (Phase 7 of the build plan, not yet started) — customers and vendors currently have no way to learn "your order shipped" or "you have a new order" except by manually checking the site.
17. **Hot-document contention risk under any real flash-sale traffic** — a well-known Firestore limitation, not fixed by anything in the current architecture.
18. **No returns time-window enforcement** — a return can be requested on an order delivered years ago.
19. **No automated tests** anywhere in the repository (confirmed by the absence of any test project in the solution) — every regression this session was caught by manual live testing, which does not scale as a QA strategy.
20. **Founder-dependency risk**: the entire platform was built and is understood by one AI-assisted engineering session with no other engineer on the team as far as this session's context shows — a classic single-point-of-knowledge-failure for due diligence purposes, independent of code quality.

---

## Top 20 Strengths

1. **The core multi-vendor money pipeline is real and correct**, not a demo — checkout splits into master order + per-vendor sub-orders, commission calculation is idempotent (`commissionsCalculated` flag), wallet crediting is transactional, and this was verified with actual Firestore reads after a live test, not just code review.
2. **The order state machine is a real, enforced graph** (`OrderStateMachine.CanTransition`), not string-typed status soup — invalid transitions are rejected server-side.
3. **Ownership checks are consistently applied** everywhere I reviewed this session — a vendor cannot read or mutate another vendor's products, orders, or returns.
4. **Firestore security rules exist and default-deny** (`match /{document=**} { allow write: if false }`) — the write surface is fully closed to direct client manipulation; everything must go through the authenticated API.
5. **JWT claim handling is correctly configured** (`MapInboundClaims = false`) — a subtle ASP.NET Core footgun that silently breaks every `[Authorize]` check if missed, and it wasn't missed (after being caught and fixed earlier this session).
6. **Real Razorpay integration**, not a stub — HMAC signature verification is implemented correctly and constant-time (`CryptographicOperations.FixedTimeEquals`), and a real test-mode payment was captured successfully tonight.
7. **The refund pipeline correctly sequences external-call-then-bookkeeping** — Razorpay is called *before* any wallet/stock/ledger reversal, so a failed external call never corrupts internal state (verified live: the one failure tonight left zero incorrect bookkeeping).
8. **Multi-vendor cart splitting matches the stated "Nykaa/Amazon-style" requirement** and was verified live with a real two-step (master + sub-order) checkout.
9. **Price/name snapshotting at checkout** — editing a product later doesn't retroactively corrupt historical order records. Correct e-commerce practice, done right without being asked.
10. **Vendor storefronts exist and are wired to real data**, not static demo pages.
11. **Admin has genuine operational visibility** — real revenue dashboards, real order/vendor/return management, not `Math.random()` placeholder charts (which is what existed before this session's Phase 2 fix).
12. **The commission/wallet/transaction-ledger model is a legitimate accounting pattern** — append-only transaction log, separate wallet balance, separate platform-revenue aggregate — the right shape for a real finance team to build on, even though the reconciliation tooling around it doesn't exist yet.
13. **Timestamp handling across the entire API was fixed correctly** (a subtle Firestore `Timestamp` → JSON serialization bug that silently broke every `createdAt`/`updatedAt` field sitewide) — the kind of bug that's invisible until you actually look at real data, and it was caught by doing exactly that.
14. **The codebase self-documents its own gotchas** — comments throughout explain *why*, not *what* (e.g., the `MapInboundClaims` note, the stock-reservation note), which lowers onboarding cost for a future engineering hire.
15. **No secrets are hardcoded in client-shipped code** beyond the intentionally-public Firebase web API key and Razorpay test key ID (standard practice — both are meant to be client-visible; the actual secrets stay server-side).
16. **Deploy pipeline is real and fast** — push to `master` deploys both Firebase Hosting (frontend) and Railway (backend) automatically, verified twice tonight with sub-3-minute turnaround.
17. **The vendor/admin/customer three-portal separation is architecturally sound** — separate entry points, separate JS trees, shared only where it should be (Firebase config, API client pattern).
18. **Return/refund state modeling is granular and auditable** — every state transition is appended to a `statusHistory` array with timestamp and actor, giving a real audit trail rather than just a current-status field.
19. **The team (this session) demonstrably fixes root causes, not symptoms** — every bug found tonight was fixed at its source (e.g., the stuck-refund fix restructures the state machine rather than patching around it).
20. **Willingness to have this exact conversation.** Asking for a hostile, adversarial audit before launch — rather than after an incident — is itself a positive signal about how this team will operate post-funding.

---

## What fails first at scale

Ranked by which limit gets hit first as vendor/order volume grows:

1. **~500 vendors/products** — hardcoded list limits (`ListAsync`/`WhereAsync` default `limit=100-500`) start silently truncating admin and vendor dashboard views with zero pagination UI to compensate.
2. **Any single-SKU flash sale with concurrent buyers** — Firestore transaction contention on one hot product document, regardless of total vendor count.
3. **~1,000+ vendors** — the generic admin CRUD (`GET /admin/{collection}`) has no filtering/search built into the frontend beyond client-side JS array filtering on an already-capped 100-500 row result — the admin literally cannot find a specific vendor by name once the visible page doesn't contain them.
4. **10,000+ products** — full-catalog client-side `Data.products` array (loaded once, filtered/searched entirely in the browser) becomes a real page-weight and search-latency problem; there's no server-side search/indexing (e.g., Algolia/Typesense) anywhere in the architecture.
5. **100+ concurrent checkouts** — no observed failure mode in this session's testing, but no load testing has been done either; the stock-decrement transaction pattern is correct but its retry/backoff behavior under real concurrent load is unverified.

---

## What prevents this from becoming Nykaa

Nykaa's moat isn't its checkout flow — Sunfara's checkout flow is now comparably real. Nykaa's moat is: (1) curated, vetted brand relationships with real authenticity guarantees, (2) a return/logistics network that makes refunds fast and trustworthy, (3) content (reviews, tutorials, influencer tie-ins) that drives organic discovery, (4) years of purchase-history data feeding personalization. Sunfara has none of the trust or content moat yet, and — per this audit — doesn't yet have the *operational* reliability (no seller vetting, no working refund rail on this Razorpay account, no notifications, no reconciliation tooling) that would let it start building that trust moat safely. The engineering is no longer the blocker; the business-process and trust layer is.

---

## What should be fixed before launch (priority order)

1. Vendor suspension must actually stop the vendor (token revocation + server-side status gate) — non-negotiable for a marketplace.
2. Get Razorpay refunds actually enabled on the live merchant account (business/KYC action, not code).
3. Cancelling a paid order must trigger the same refund pipeline as a return, or be blocked entirely post-payment.
4. Stock reservation needs a release mechanism (timeout job or reserve-only-on-payment-confirm).
5. Add a Razorpay webhook as the source of truth for payment confirmation, with the client-side verify call as a fast-path optimization, not the only path.
6. Gate the public product feed on `status == "active"` to match the security rules' own intent.
7. Fix the systemic XSS pattern (shared escaping utility, swept across every user-text render), prioritizing admin-panel-visible fields first.
8. Add pagination to every list endpoint and its corresponding UI before onboarding vendors past low hundreds.
9. Add a reconciliation admin action for platform revenue vs. the transaction ledger.
10. Basic rate limiting on checkout, registration, and withdrawal endpoints.

---

## Launch Readiness Score: **38 / 100**

Up from the ~22/100 scored in the earlier `MARKETPLACE_READINESS_AUDIT.md` this session — the jump reflects that the core transaction pipeline (Phases 1-6 of the build plan: vendor onboarding, money pipeline, order lifecycle, multi-vendor cart, vendor storefronts, and now returns/refunds) is genuinely built and live-verified, which it was not before. The score is still well below "ready for real users and real money" because every point above 2-3 is exactly the kind of finding that turns into a support ticket, a chargeback, or a regulator letter in week one of real usage — and because trust/vetting/notification infrastructure (the parts that don't show up in a demo but are the actual job of a marketplace) hasn't been started.

**Would I invest at this checkpoint:** no. **Would I invest after a 60-90 day pilot with the priority-order fixes above closed and real (even small) transaction volume:** yes, conditionally, and at a materially different valuation than a pre-revenue $1M pre-money ask implies today.
