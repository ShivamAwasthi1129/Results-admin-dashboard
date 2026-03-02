#!/usr/bin/env node
/**
 * CRUD-style tests for project APIs (all proxy to external backend).
 * Run: node scripts/test-crud-apis.mjs
 * Or:  BASE=http://localhost:3000 TOKEN=your_jwt node scripts/test-crud-apis.mjs
 *
 * Uses GET to list, then optional POST/PUT/DELETE if TOKEN is set.
 * Reports which APIs return data and which fail.
 */

const BASE = process.env.BASE || 'http://localhost:3000';
const TOKEN = process.env.TOKEN || '';

const apis = [
  { name: 'Products', path: '/api/products?limit=20', listKey: 'products', dataKey: 'data' },
  { name: 'Shelters', path: '/api/shelters', listKey: null, dataKey: 'data' },
  { name: 'Emergencies', path: '/api/emergencies?limit=20', listKey: 'emergencies', dataKey: 'data' },
  { name: 'Disasters', path: '/api/disasters?limit=20', listKey: 'disasters', dataKey: 'data' },
  { name: 'Devices', path: '/api/devices?limit=20', listKey: 'devices', dataKey: 'data' },
  { name: 'Incidents', path: '/api/incidents?limit=20', listKey: null, dataKey: 'data' },
  { name: 'Adjusters', path: '/api/adjusters?limit=20', listKey: 'adjusters', dataKey: 'data' },
  { name: 'Volunteers', path: '/api/volunteers?limit=20', listKey: 'volunteers', dataKey: 'data' },
  { name: 'Volunteer teams', path: '/api/volunteer-teams?limit=20', listKey: 'teams', dataKey: 'data' },
  { name: 'Orders', path: '/api/orders?limit=20', listKey: 'orders', dataKey: 'data' },
  { name: 'Services', path: '/api/services?limit=20', listKey: 'serviceProviders', dataKey: 'data' },
  { name: 'Ops users', path: '/api/ops-users?limit=20', listKey: 'users', dataKey: 'data' },
  { name: 'Damage reports', path: '/api/damage-reports?limit=20', listKey: 'damageReports', dataKey: 'data' },
  { name: 'Reports', path: '/api/reports?limit=5', listKey: null, dataKey: 'data' },
  { name: 'Dashboard stats', path: '/api/dashboard/stats', listKey: null, dataKey: 'data' },
  { name: 'Live disasters', path: '/api/live-disasters', listKey: 'disasters', dataKey: 'data' },
];

async function testList(api) {
  const url = BASE + api.path;
  const headers = { Accept: 'application/json' };
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
  try {
    const res = await fetch(url, { method: 'GET', headers });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, status: res.status, error: 'Invalid JSON' };
    }
    if (!res.ok) return { ok: false, status: res.status, error: data.error || data.message || text.slice(0, 80) };
    const list = api.listKey ? data.data?.[api.listKey] : data.data;
    const count = Array.isArray(list) ? list.length : (list ? 1 : 0);
    return { ok: true, status: res.status, count, success: data.success };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function main() {
  console.log('\n--- CRUD API tests ---');
  console.log('BASE:', BASE);
  console.log('TOKEN:', TOKEN ? `${TOKEN.slice(0, 12)}...` : '(none - list only)\n');

  let passed = 0;
  let failed = 0;
  for (const api of apis) {
    const result = await testList(api);
    const badge = result.ok ? '✓' : '✗';
    if (result.ok) passed++; else failed++;
    const extra = result.count !== undefined ? ` (${result.count} items)` : '';
    const errStr = result.error ? ` - ${result.error}` : '';
    console.log(`${badge} ${api.name.padEnd(22)} ${(result.status || result.error || '').toString().padEnd(8)}${extra}${errStr}`);
  }

  console.log(`\n${passed} passed, ${failed} failed.`);
  if (!TOKEN) console.log('Set TOKEN=your_jwt to test authenticated endpoints.\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
