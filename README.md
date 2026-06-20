# OmniSync Backend + Website (same-origin, no CORS)

This now contains **both** the API proxy and the website together, served from
one Vercel project. That eliminates the CORS error entirely, because the
website calling /api/trendyol-orders is now a same-origin request.

## Folder structure
```
omnisync_backend/
  api/              <- serverless functions (Amazon, Noon, Trendyol proxies)
  public/index.html <- the website (now calls /api/... with relative paths)
  vercel.json
```

## Redeploy (update your existing GitHub repo)
1. Go to your omnisync-backend repo on github.com
2. Click "Add file" -> "Upload files"
3. Drag in this entire updated folder (overwrite when prompted) - specifically
   make sure public/index.html and vercel.json get added/updated
4. Commit changes
5. Vercel auto-redeploys within ~30 seconds (since it's connected to this repo)

## After redeploy
Open https://omnisync-backend.vercel.app/ directly in your browser - this
now shows the actual OmniSync website (not a 404), already wired correctly.
Stop opening the old local index.html file - always use this hosted URL
from now on, since that's what fixes the CORS + Chart.js loading errors you
saw.

Go to Integrations tab -> enter your real Trendyol/Amazon keys -> Save & Connect
-> should sync immediately with no CORS error.
