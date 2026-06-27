const { applyCors } = require('./_cors');

// POST /api/trendyol-orders
// Body: { apiKey, apiSecret, sellerId }  (or set TRENDYOL_API_KEY / TRENDYOL_API_SECRET /
// TRENDYOL_SELLER_ID as environment variables in Vercel for production — env vars win if set)
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
    const endDate = Date.now();
    const startDate = endDate - 14 * 24 * 60 * 60 * 1000; // Trendyol max range per call
    const url = `https://apigw.trendyol.com/integration/order/sellers/${sellerId}/orders?startDate=${startDate}&endDate=${endDate}&size=200&orderByField=PackageLastModifiedDate&orderByDirection=DESC`;

    const resp = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        'User-Agent': `${sellerId} - SelfIntegration`,
        storeFrontCode: 'SA', // required for Saudi Arabia storefront
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: `Trendyol API error ${resp.status}`, detail: text.slice(0, 500) });
    }

    const data = await resp.json();
    const orders = (data.content || []).map((o) => ({
      id: String(o.orderNumber || o.shipmentPackageId || o.id),
      marketplace: 'trendyol',
      date: o.orderDate ? new Date(o.orderDate).toISOString() : new Date().toISOString(),
      total: parseFloat(o.packageTotalPrice ?? o.totalPrice ?? o.packageGrossAmount ?? 0),
      status: o.status || o.shipmentPackageStatus || 'Pending',
      city: o.shipmentAddress?.city || '',
    }));

    return res.status(200).json({ orders });
  } catch (err) {
    return res.status(500).json({ error: 'Proxy failure', detail: String(err.message || err) });
  }
};
