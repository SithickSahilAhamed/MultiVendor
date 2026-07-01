# Sunfara C# Backend

ASP.NET Core 9 commerce backend using Firebase Authentication and Firestore, modeled from Bagisto 2.4 concepts while exposing simple REST contracts for the existing Sunfara frontend.

## Included schema foundation

Channels, categories, vendors, simple/configurable products, inventory sources, inventory reservations, customers, addresses, carts, orders, reviews, coupons and marketplace commissions.

## Run

```powershell
dotnet run --project src/Sunfara.Api
```

Set `GOOGLE_APPLICATION_CREDENTIALS` to a Firebase service-account JSON path, then open `/swagger`. Clients send Firebase ID tokens as `Authorization: Bearer <token>`.

## Migration roadmap

1. Catalog and inventory (current foundation)
2. Identity/JWT and role policies
3. Transactional cart/checkout and stock reservation
4. Payment/shipping adapters
5. Vendor payouts, refunds and RMA
6. Promotions, tax, CMS and reporting

Bagisto remains the behavioral/schema reference; its PHP tables are not queried directly.
