# Sunfara / Iqral multi-vendor platform

Authoritative production stack:

- **API:** ASP.NET Core 9 `Sunfara.Api` — Railway Docker (`Dockerfile` + `railway.json`)
- **Frontend:** `sunfara/` SPA — Firebase Hosting / Netlify
- **Auth / data / pay:** Firebase Auth + Cloud Firestore + Razorpay
- **Delivery:** Browser-based responsive web only (no React Native / native apps)

Express (`server.js`) and the **root** SPA (`index.html` / `js/`) are **legacy / non-production**.

Ops detail: Project store `docs/ops/STACK_RUNBOOK.md` (ARCH-001). Phase 5 security ops: `APP_CHECK_OPS.md`, `SECURITY_HEADERS.md`.

## What is included

- Authoritative storefront / admin / vendor UI under `sunfara/`
- Authoritative backend under `sunfara-backend-dotnet`
- Quarantined Express deploy stubs: `Procfile`, `render.yaml`, `vercel.json` (ARCH-002)
- Root SPA and Express sources retained as archive only

## Run locally

Single local API URL: **`http://localhost:5187`**

```bash
# API (.NET)
dotnet run --project sunfara-backend-dotnet/src/Sunfara.Api/Sunfara.Api.csproj

# Frontend (serve sunfara/)
cd sunfara && python -m http.server 8000
```

Smoke:

```bash
curl -sS -D - http://localhost:5187/api/health -o /dev/null | head
bash scripts/assert-authoritative-stack.sh
node scripts/xss-escape-fixtures.mjs
```

`npm start` / `npm run dev` at the repo root are quarantined and exit non-zero. Legacy Express only via `npm run start:legacy-express` (not for production).

## Deployment

| Target | Path |
| --- | --- |
| API | Railway builds root `Dockerfile` → `dotnet Sunfara.Api.dll` |
| Frontend | Firebase Hosting (`public: sunfara`); Netlify `base = sunfara` |
| CI frontend deploy | `.github/workflows/deploy.yml` |
| Stack guard | `.github/workflows/stack-guard.yml` |

Do **not** deploy commerce via Heroku/Render/Vercel Node configs in this repo. Do **not** change live Railway/Firebase production secrets/settings from agent PRs — residual App Check enablement is ops-only.

## Notes

- Root `.env.example` describes legacy Express variables; Railway uses Firebase + Razorpay env names documented in the ops runbook (names only — never commit secrets).
- Firebase web `apiKey` is public by design; protect with App Check + Auth authorized domains (SEC-003).
