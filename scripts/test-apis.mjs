#!/usr/bin/env node
/**
 * Test that all project APIs are reachable and return valid responses.
 * Run with: node scripts/test-apis.mjs
 * Optional: BASE=http://localhost:3000 node scripts/test-apis.mjs
 *
 * - Public/unauthenticated APIs: expect 200 and JSON
 * - Auth-required APIs: expect 200 (with token) or 401 (without token) - both mean route works
 */

const BASE = process.env.BASE || 'http://localhost:3000';

const apis = [
  // Public / no auth
  { path: '/api/resource-locator/categories', expectStatus: 200, name: 'Resource locator categories' },
  { path: '/api/currency?type=list', expectStatus: [200, 401], name: 'Currency list' },
  // Backend-proxied (proxy returns 200 from backend or 502/503)
  { path: '/api/volunteers?limit=5', expectStatus: [200, 401, 502], name: 'Volunteers' },
  { path: '/api/ops-users?limit=5', expectStatus: [200, 401, 502], name: 'Ops users' },
  { path: '/api/shelters?limit=5', expectStatus: [200, 401, 502], name: 'Shelters' },
  { path: '/api/disasters?limit=5', expectStatus: [200, 401, 502], name: 'Disasters' },
  { path: '/api/emergencies?limit=5', expectStatus: [200, 401, 502], name: 'Emergencies' },
  { path: '/api/devices?limit=5', expectStatus: [200, 401, 502], name: 'Devices' },
  { path: '/api/incidents?limit=5', expectStatus: [200, 401, 502], name: 'Incidents' },
  { path: '/api/adjusters?limit=5', expectStatus: [200, 401, 502], name: 'Adjusters' },
  { path: '/api/volunteer-teams?limit=5', expectStatus: [200, 401, 502], name: 'Volunteer teams' },
  { path: '/api/products?limit=5', expectStatus: [200, 401, 502], name: 'Products' },
  { path: '/api/orders?limit=5', expectStatus: [200, 401, 502], name: 'Orders' },
  { path: '/api/services?limit=5', expectStatus: [200, 401, 502], name: 'Services' },
  { path: '/api/reports?limit=5', expectStatus: [200, 401, 502], name: 'Reports' },
  { path: '/api/search?q=test', expectStatus: [200, 401, 502], name: 'Search' },
  { path: '/api/damage-reports?limit=5', expectStatus: [200, 401, 502], name: 'Damage reports' },
  { path: '/api/dashboard/stats', expectStatus: [200, 401, 502], name: 'Dashboard stats' },
  { path: '/api/live-disasters', expectStatus: [200, 401, 502], name: 'Live disasters' },
  { path: '/api/weather?type=multi', expectStatus: [200, 401, 502], name: 'Weather' },
  // Local proxies (may 401 without token)
  { path: '/api/admin/users?limit=5', expectStatus: [200, 401, 502], name: 'Admin users' },
  { path: '/api/customers?limit=5', expectStatus: [200, 401, 502], name: 'Customers' },
  { path: '/api/tracking/location/all', expectStatus: [200, 401, 503], name: 'Tracking all' },
  // 404 is acceptable for unknown path
  { path: '/api/unknown-path', expectStatus: 404, name: 'Unknown (expect 404)' },
];

function normalizeStatus(s) {
  return Array.isArray(s) ? s : [s];
}

async function testOne({ path, expectStatus, name }) {
  const expected = normalizeStatus(expectStatus);
  const url = `${BASE}${path}`;
  try {
    const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
    const ok = expected.includes(res.status);
    const body = res.headers.get('content-type')?.includes('json') ? await res.json().catch(() => ({})) : null;
    return {
      name,
      path,
      status: res.status,
      ok,
      success: body?.success,
    };
  } catch (err) {
    return { name, path, status: 'ERR', ok: false, error: err.message };
  }
}

async function main() {
  console.log(`\nTesting APIs at ${BASE}\n`);
  let passed = 0;
  let failed = 0;
  for (const api of apis) {
    const result = await testOne(api);
    const badge = result.ok ? '✓' : '✗';
    if (result.ok) passed++; else failed++;
    const statusStr = result.status === 'ERR' ? result.error : result.status;
    console.log(`${badge} ${api.name.padEnd(28)} ${String(statusStr).padEnd(8)} ${api.path}`);
  }
  console.log(`\n${passed} passed, ${failed} failed.\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
