# Bagisto-to-Sunfara parity gate

`bagisto-2.4` must not be deleted until every required row is implemented, integration-tested against Firestore, connected to the Sunfara UI, and marked verified.

| Domain | Required capability | Status |
|---|---|---|
| Identity | Firebase customers, vendors, admins, custom role claims | In progress |
| Vendors | Registration, approval, KYC, stores, staff, commission policies | Planned |
| Catalog | Categories, attributes, families, variants, bundles, downloads, bookings | In progress |
| Inventory | Multiple sources, reservation, release, deduction, adjustment audit | Planned |
| Cart | Guest/customer carts, coupons, tax, shipping estimates | Planned |
| Checkout | Atomic order split by vendor and inventory reservation | Planned |
| Sales | Orders, vendor sub-orders, invoices, shipments, cancellations | Planned |
| Payments | Razorpay/Stripe adapters, webhook idempotency, transactions | Planned |
| Marketplace | Per-item commission, fees, earnings, settlements, withdrawals | Planned |
| Returns | RMA, return approval, partial/full refunds | Planned |
| Reviews | Verified purchase, moderation, vendor replies, aggregates | Planned |
| Promotions | Catalog rules, cart rules, coupons and usage limits | Planned |
| Tax/shipping | Configurable tax classes, zones, carriers and tracking | Planned |
| Customers | Profiles, addresses, groups, wishlist, GDPR export/delete | Planned |
| Content | CMS pages, media, SEO, sitemap | Planned |
| Operations | Import/export, notifications, audit logs, analytics | Planned |
| Security | Firestore rules, API authorization, validation, rate limits | Planned |
| Verification | Unit, emulator integration and browser end-to-end tests | Planned |

## Deletion rule

Delete Bagisto only after all rows are verified, a backup/archive is confirmed, and the final automated test suite passes. Documentation claims do not count as verification.
