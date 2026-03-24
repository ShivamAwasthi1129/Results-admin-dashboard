/**
 * Test Printify order APIs (GET order, cancel, send_to_production).
 * Run after dev server is up: node scripts/test-printify-order-apis.mjs
 * Uses ORDER_ID and SHOP_ID from env or defaults.
 */
const BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const ORDER_ID = process.env.PRINTIFY_TEST_ORDER_ID || '69b4391b176783b7110fe4d2';
const SHOP_ID = process.env.PRINTIFY_TEST_SHOP_ID || '26782803';

async function test(name, url, options = {}) {
  const method = options.method || 'GET';
  try {
    const res = await fetch(url, { method, cache: 'no-store', ...options });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    const fromBackend = body && body.message === 'Route not found';
    if (res.status === 404 && fromBackend) {
      console.log(`❌ ${name}: 404 from BACKEND (request was proxied; restart dev server and ensure next.config.mjs has no catch-all for /api/*)`);
      return false;
    }
    if (res.status === 404) {
      console.log(`❌ ${name}: 404`, body?.error || body?.message || text?.slice(0, 80));
      return false;
    }
    if (res.status >= 500) {
      console.log(`⚠️ ${name}: ${res.status}`, body?.error || body?.message || '');
      return res.status === 503 && body?.error?.includes('token'); // 503 token = our route hit
    }
    if (res.status >= 400) {
      console.log(`⚠️ ${name}: ${res.status}`, body?.error || body?.message || '');
      return true; // route hit, Printify or validation error
    }
    console.log(`✅ ${name}: ${res.status}`, method, body?.success != null ? `success=${body.success}` : '');
    return true;
  } catch (e) {
    console.log(`❌ ${name}:`, e.message);
    return false;
  }
}

async function main() {
  console.log('Testing Printify order APIs at', BASE);
  console.log('Order ID:', ORDER_ID, '| Shop ID:', SHOP_ID);
  console.log('');

  const getUrl = `${BASE}/api/printify/orders/${ORDER_ID}?shop_id=${SHOP_ID}`;
  const cancelUrl = `${BASE}/api/printify/orders/${ORDER_ID}/cancel?shop_id=${SHOP_ID}`;
  const sendUrl = `${BASE}/api/printify/orders/${ORDER_ID}/send_to_production?shop_id=${SHOP_ID}`;

  const r1 = await test('GET order detail', getUrl);
  const r2 = await test('POST cancel (no-op if already canceled)', cancelUrl, { method: 'POST' });
  const r3 = await test('POST send_to_production (no-op if already sent)', sendUrl, { method: 'POST' });

  console.log('');
  if (r1) {
    console.log('GET order: route is hit (no backend 404). Rest of errors may be from Printify (token/shop/order).');
  } else {
    console.log('Fix: Restart dev server (npm run dev). Ensure next.config.mjs has no /api/:path* catch-all in afterFiles.');
  }
}

main();
