const { applyCors } = require('./_cors');

// POST /api/amazon-products
// Body: { apiKey (Client ID), apiSecret (Client Secret), sellerId (Refresh Token), merchantId? }
// Uses SP-API searchListingsItems to return live listings for the KSA marketplace.
// NOTE: requires the "Product Listing" role on your SP-API app and a valid sellerId
// (merchant token). If you pass the refresh token in sellerId (as the orders adapter
// does), also supply merchantId for the seller/merchant token used in the path.
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
    const merchantId = process.env.AMAZON_MERCHANT_ID || body.merchantId || body.sellerId;

    if (!clientId || !clientSecret || !refreshToken) {
      return res.status(400).json({ error: 'Missing Amazon credentials (Client ID, Client Secret, Refresh Token)' });
    }
    if (!merchantId) {
      return res.status(400).json({ error: 'Amazon products require a Merchant/Seller token (merchantId). Add it in the connector.' });
    }

    // Step 1: LWA token
    const tokenResp = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret }),
    });
    if (!tokenResp.ok) {
      const text = await tokenResp.text();
      return res.status(tokenResp.status).json({ error: 'Amazon LWA token exchange failed', detail: text.slice(0, 500) });
    }
    const tokenData = await tokenResp.json();

    // Step 2: searchListingsItems (up to 20 per page; one page here, paginate if needed)
    const url = `${SPAPI_ENDPOINT}/listings/2021-08-01/items/${encodeURIComponent(merchantId)}?marketplaceIds=${KSA_MARKETPLACE_ID}&includedData=summaries,offers,fulfillmentAvailability&pageSize=20`;
    const resp = await fetch(url, { headers: { 'x-amz-access-token': tokenData.access_token } });
    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: `Amazon Listings API error ${resp.status}`, detail: text.slice(0, 500) });
    }
    const data = await resp.json();

    const products = (data.items || []).map((it) => {
      const summary = (it.summaries && it.summaries[0]) || {};
      const offer = (it.offers && it.offers[0]) || {};
      const fa = (it.fulfillmentAvailability && it.fulfillmentAvailability[0]) || {};
      const statusArr = summary.status || [];
      const listingStatus = statusArr.includes('BUYABLE') || statusArr.includes('DISCOVERABLE') ? 'Active' : 'Inactive';
      return {
        sku: it.sku || summary.asin || '',
        name: summary.itemName || 'Untitled',
        marketplace: 'amazon',
        price: offer.price?.amount != null ? parseFloat(offer.price.amount) : null,
        cost: null,
        stock: typeof fa.quantity === 'number' ? fa.quantity : null,
        reorder: 0,
        unitsSold30d: null,
        rating: null,
        listingStatus,
        isLiveListing: true,
      };
    });

    return res.status(200).json({ products });
  } catch (err) {
    return res.status(500).json({ error: 'Proxy failure', detail: String(err.message || err) });
  }
};
