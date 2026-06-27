const { applyCors } = require('./_cors');

// POST /api/noon-products
// Body: { apiKey, sellerId, baseUrl? }
// Noon's catalog API host/auth format is issued per-seller by your Noon account
// manager (FBPI / Merchant API). Update the URL + headers below to match the
// spec they provide. Until then this returns a clear error, never mock data.
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

    const resp = await fetch(`${baseUrl}/v2/fbp/offers`, {
      headers: { Authorization: `Key ${apiKey}`, 'X-Seller-Id': sellerId },
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({
        error: `Noon Catalog API error ${resp.status}`,
        detail: text.slice(0, 500) + ' — confirm the exact catalog endpoint/header with your Noon account manager and update api/noon-products.js',
      });
    }

    const data = await resp.json();
    const products = (data.offers || data.products || []).map((p) => ({
      sku: String(p.sku || p.partner_sku || p.offer_code || ''),
      name: p.title || p.name || 'Untitled',
      marketplace: 'noon',
      price: p.price != null ? parseFloat(p.price) : null,
      cost: null,
      stock: typeof p.stock === 'number' ? p.stock : (typeof p.quantity === 'number' ? p.quantity : null),
      reorder: 0,
      unitsSold30d: null,
      rating: null,
      listingStatus: p.is_active === false ? 'Inactive' : (p.status || 'Active'),
      isLiveListing: true,
    }));

    return res.status(200).json({ products });
  } catch (err) {
    return res.status(500).json({ error: 'Proxy failure', detail: String(err.message || err) });
  }
};
