# OmniSync — Commerce OS (Live-Data Build)

Production data layer: the dashboard renders ONLY from real marketplace API
data synced through the backend adapters. There is no mock/dummy fallback —
when nothing is synced, modules show an explicit "No live data" state.

## How data flows
1. Integrations tab -> enter marketplace credentials -> Save & Connect
2. "Sync Now" calls /api/{marketplace}-orders (and -products where supported)
3. Real orders/products are normalized and stored as the single source of truth
4. Every KPI, chart and table is computed from that synced data, scoped by the
   global Marketplace + date-range filters
5. Connected marketplaces auto-resync every 60 seconds

## Endpoints (Vercel serverless)
- POST /api/trendyol-orders     -> live KSA orders (storeFrontCode SA, 14-day window)
- POST /api/trendyol-products   -> live listings + real units-sold from order history
- POST /api/amazon-products     -> live listings via SP-API searchListingsItems (needs Product Listing role + merchant token)
- POST /api/noon-products       -> live catalog (confirm host/header with Noon account manager)
- POST /api/amazon-orders       -> live SP-API orders (KSA marketplace A17E79C6D8DWNP)
- POST /api/noon-orders         -> Noon FBPI/Merchant API (confirm host/header with your account manager)

## What is real vs. pending
- Trendyol orders + product listings + listing status: REAL
- Trendyol live stock COUNT: not exposed by Trendyol's read API (shown as "—")
- Advertising metrics: require a dedicated Ads API sync; until then the Ads tab
  shows an honest empty state (no fabricated ACOS/ROAS)
- Amazon / Noon: order adapters ready; need valid credentials to go live

## Deploy
Push this folder to your GitHub repo (api/* and public/index.html at root of
the repo as before). Vercel auto-redeploys.
