# OmniSync Commerce Intelligence Platform

This package contains the updated OmniSync UI and same-origin API proxy endpoints for Amazon, Noon, and Trendyol.

## What is included

- Dedicated Integrations section for Amazon, Noon, and Trendyol credentials.
- Same-origin API proxy endpoints under `/api/*-orders` to avoid browser CORS issues.
- Clean modern Chart.js visualizations replacing the previous 3D chart design.
- Top-right User Profile menu with role, account settings, MFA, notifications, and security actions.
- Global Marketplace Selector and Date Range Selector applied across all modules.
- Advertising Customize Columns feature with ACOS, ROAS, Clicks, Impressions, CTR, CVR, Orders, Sales, Spend, CPC, Conversion Rate, Revenue, and marketplace-specific metrics.
- Interactive drill-down drawers, filters, clickable tables, notes with @mentions, sync logs, and export buttons.
- Product Management, User Permissions, Order Management, Product Returns, Marketplace Finance, Inventory, Marketplace Command, Advertising, and Analytics modules.

## Important production note

For best security, store real API credentials in Vercel Environment Variables instead of committing them or permanently storing them in the browser.

Supported environment variables:

```bash
AMAZON_CLIENT_ID=
AMAZON_CLIENT_SECRET=
AMAZON_REFRESH_TOKEN=

TRENDYOL_API_KEY=
TRENDYOL_API_SECRET=
TRENDYOL_SELLER_ID=

NOON_API_KEY=
NOON_SELLER_ID=
NOON_BASE_URL=
```

## Deploy

1. Upload this `omnisync_backend` folder to your GitHub repository.
2. Commit and push the changes.
3. Let Vercel redeploy automatically.
4. Open the deployed Vercel URL.
5. Go to **Integrations** and connect each marketplace.

## Real-time data accuracy

The UI is wired to the marketplace proxy endpoints. Accurate real-time reporting requires valid marketplace credentials, correct API endpoint access, and marketplace API availability. For automatic refresh, configure a Vercel cron/background sync job or trigger **Sync All Marketplaces** from the Integrations page.
