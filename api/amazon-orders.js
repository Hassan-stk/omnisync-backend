const { applyCors } = require('./_cors');

// POST /api/amazon-orders
// Body: { apiKey (LWA Client ID), apiSecret (LWA Client Secret), sellerId (Refresh Token) }
// Or set AMAZON_CLIENT_ID / AMAZON_CLIENT_SECRET / AMAZON_REFRESH_TOKEN as env vars in Vercel.
const KSA_MARKETPLACE_ID = 'A17E79C6D8DWNP';
const SPAPI_ENDPOINT = 'https://sellingpartnerapi-eu.amazon.com';

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  try {
    const body = req.body || {};
    const clientId = process.env.AMAZON_CLIENT_ID || body.apiKey;
    const clientSecret = process.env.AMAZON_CLIENT_SECRET || body.apiSecret;
    const refreshToken = process.env.AMAZON_REFRESH_TOKEN || body.sellerId;

    if (!clientId || !clientSecret || !refreshToken) {
      return res.status(400).json({ error: 'Missing Amazon credentials (Client ID, Client Secret, Refresh Token)' });
    }

    // Step 1: exchange refresh token for access token via LWA
    const tokenResp = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResp.ok) {
      const text = await tokenResp.text();
      return res.status(tokenResp.status).json({ error: 'Amazon LWA token exchange failed', detail: text.slice(0, 500) });
    }
    const tokenData = await tokenResp.json();

    // Step 2: fetch orders from the last 30 days for the KSA marketplace
    const createdAfter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const ordersUrl = `${SPAPI_ENDPOINT}/orders/v0/orders?MarketplaceIds=${KSA_MARKETPLACE_ID}&CreatedAfter=${createdAfter}`;

    const resp = await fetch(ordersUrl, {
      headers: { 'x-amz-access-token': tokenData.access_token },
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: `Amazon Orders API error ${resp.status}`, detail: text.slice(0, 500) });
    }

    const data = await resp.json();
    const orders = (data.payload?.Orders || []).map((o) => ({
      id: o.AmazonOrderId,
      marketplace: 'amazon',
      date: o.PurchaseDate,
      total: parseFloat(o.OrderTotal?.Amount || 0),
      status: o.OrderStatus || 'Pending',
      city: o.ShippingAddress?.City || '',
    }));

    return res.status(200).json({ orders });
  } catch (err) {
    return res.status(500).json({ error: 'Proxy failure', detail: String(err.message || err) });
  }
};
