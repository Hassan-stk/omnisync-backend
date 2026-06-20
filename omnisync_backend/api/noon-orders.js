const { applyCors } = require('./_cors');

// POST /api/noon-orders
// Body: { apiKey, sellerId, baseUrl? }
// Noon has no single public API host/spec — your account manager issues the
// exact host + auth header format when they grant FBPI/Merchant API access.
// Update NOON_BASE_URL / the auth header below to match what they send you.
// Until then this endpoint will return a clear error rather than fake data.
module.exports = async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  try {
    const body = req.body || {};
    const apiKey = process.env.NOON_API_KEY || body.apiKey;
    const sellerId = process.env.NOON_SELLER_ID || body.sellerId;
    const baseUrl = process.env.NOON_BASE_URL || body.baseUrl || 'https://api.noon.partners';

    if (!apiKey || !sellerId) {
      return res.status(400).json({ error: 'Missing Noon credentials (apiKey, sellerId)' });
    }

    const resp = await fetch(`${baseUrl}/v2/fbp/orders`, {
      headers: {
        Authorization: `Key ${apiKey}`,
        'X-Seller-Id': sellerId,
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({
        error: `Noon API error ${resp.status}`,
        detail: text.slice(0, 500) + ' — confirm the exact endpoint/header format with your Noon account manager and update api/noon-orders.js',
      });
    }

    const data = await resp.json();
    const orders = (data.orders || []).map((o) => ({
      id: String(o.order_id),
      marketplace: 'noon',
      date: o.created_at || new Date().toISOString(),
      total: parseFloat(o.total_amount || 0),
      status: o.status || 'Pending',
      city: o.city || '',
    }));

    return res.status(200).json({ orders });
  } catch (err) {
    return res.status(500).json({ error: 'Proxy failure', detail: String(err.message || err) });
  }
};
