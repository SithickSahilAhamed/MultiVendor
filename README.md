# Sunfara and backend platform

This repository combines the Sunfara storefront/admin frontend with the backend modernization work in `sunfara-backend-dotnet`.

## What is included

- Sunfara storefront and admin UI in the repository root
- Backend services and tests in `sunfara-backend-dotnet`
- Static deployment config for the frontend
- Firebase, Netlify, Render, Railway, and Vercel config files where needed

## Frontend

The frontend is a vanilla HTML, CSS, and JavaScript ecommerce experience with:

- Product browsing, cart, checkout, auth, orders, profile, wishlist, and content pages
- An admin dashboard for vendors, orders, products, reports, and settings
- JSON-backed catalog and content data

## Backend

The backend workspace contains:

- .NET solution and API project under `sunfara-backend-dotnet`
- Domain, infrastructure, and test projects
- Migration notes and supporting configuration

## Run locally

Frontend:

```bash
python -m http.server 8000
```

Backend:

```bash
dotnet run --project sunfara-backend-dotnet/src/Sunfara.Api/Sunfara.Api.csproj
```

## Deployment

Use the frontend as a static site and deploy the backend separately through your preferred .NET host.

The Netlify config in this repo is set up for the root-level frontend files and SPA routing.

## Notes

- Demo admin access and catalog data are still part of the frontend experience.
- If you want the backend and frontend split into separate deploy targets, keep the frontend static and point the frontend API client at the backend URL.