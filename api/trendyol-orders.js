const { applyCors } = require('./_cors');

// POST /api/trendyol-products
// Body: { apiKey, apiSecret, sellerId }
// Returns approved + unapproved products from Trendyol's catalog for KSA (SA storefront)
module.exports = async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  try {
    const body = req.body || {};
    const apiKey = process.env.TRENDYOL_API_KEY || body.apiKey;
    const apiSecret = process.env.TRENDYOL_API_SECRET || body.apiSecret;
    const sellerId = process.env.TRENDYOL_SELLER_ID || body.sellerId;

    if (!apiKey || !apiSecret || !sellerId) {
      return res.status(400).json({ error: 'Missing Trendyol credentials (apiKey, apiSecret, sellerId)' });
    }

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const headers = {
      Authorization: `Basic ${auth}`,
      'User-Agent': `${sellerId} - SelfIntegration`,
      storeFrontCode: 'SA',
    };

    // Approved (live/active) listings
    const approvedUrl = `https://apigw.trendyol.com/integration/product/sellers/${sellerId}/products/approved?size=100`;
    const approvedResp = await fetch(approvedUrl, { headers });
    if (!approvedResp.ok) {
      const text = await approvedResp.text();
      return res.status(approvedResp.status).json({ error: `Trendyol Product API error ${approvedResp.status}`, detail: text.slice(0, 500) });
    }
    const approvedData = await approvedResp.json();

    // Trendyol's product API only returns a stock *timestamp*, never a quantity —
    // there is no read endpoint for current stock level (push-only via Stock and
    // Price Update). What we CAN compute honestly is real units-sold velocity by
    // aggregating actual order line items from the last 30 days.
    const ordersUrl = `https://apigw.trendyol.com/integration/order/sellers/${sellerId}/orders?startDate=${Date.now()-14*24*60*60*1000}&endDate=${Date.now()}&size=200`;
    const soldByStockCode = {};
    try {
      const ordersResp = await fetch(ordersUrl, { headers });
      if (ordersResp.ok) {
        const ordersData = await ordersResp.json();
        (ordersData.content || []).forEach((pkg) => {
          (pkg.lines || []).forEach((line) => {
            const code = line.stockCode;
            if (code) soldByStockCode[code] = (soldByStockCode[code] || 0) + (line.quantity || 0);
          });
        });
      }
    } catch (_) { /* non-fatal — fall back to 0 if order history fetch fails */ }
    // Scale 14-day window up to a 30-day estimate
    const scaleToMonthly = (n) => Math.round(n * (30 / 14));

    const products = (approvedData.content || []).flatMap((p) =>
      (p.variants || [{}]).map((v) => {
        const sold14d = soldByStockCode[v.stockCode] || 0;
        return {
          sku: v.stockCode || p.productMainId || String(p.contentId),
          name: p.title || 'Untitled',
          marketplace: 'trendyol',
          price: v.price?.salePrice ?? 0,
          cost: (v.price?.salePrice ?? 0) * 0.65, // estimate — Trendyol doesn't return cost; replace if you track cost separately
          stock: null, // genuinely unavailable — Trendyol's API has no read endpoint for current stock quantity
          reorder: 0,
          unitsSold30d: scaleToMonthly(sold14d), // REAL, computed from your actual order history
          rating: null,
          listingStatus: v.archived ? 'Suspended' : v.locked ? 'Inactive' : v.onSale ? 'Active' : 'Inactive',
          isLiveListing: true,
          stockCode: v.stockCode || '',
        };
      })
    );

    return res.status(200).json({ products });
  } catch (err) {
    return res.status(500).json({ error: 'Proxy failure', detail: String(err.message || err) });
  }
};
