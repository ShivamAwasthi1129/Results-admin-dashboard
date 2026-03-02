/**
 * Test all dashboard APIs (CRUD and others) and write results to docs/API-TEST-RESULTS.md.
 * Usage: BASE_URL=http://localhost:3000 [LOGIN_EMAIL=... LOGIN_PASSWORD=...] npx tsx scripts/test-all-apis.ts
 * Ensure dev server is running (npm run dev) before running.
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface TestCase {
  module: string;
  method: Method;
  path: string;
  body?: object;
  auth?: boolean;
  description?: string;
}

const TESTS: TestCase[] = [
  // Auth
  { module: 'Auth', method: 'POST', path: '/api/auth/login', body: { email: process.env.LOGIN_EMAIL || 'admin@test.com', password: process.env.LOGIN_PASSWORD || 'password' }, auth: false, description: 'Login' },
  { module: 'Auth', method: 'GET', path: '/api/auth/me', auth: true, description: 'Current user' },
  { module: 'Auth', method: 'POST', path: '/api/auth/logout', auth: true, description: 'Logout' },
  // Weather (local)
  { module: 'Weather', method: 'GET', path: '/api/weather', auth: false, description: 'Weather default' },
  { module: 'Weather', method: 'GET', path: '/api/weather?type=multi', auth: false, description: 'Multi city' },
  { module: 'Weather', method: 'GET', path: '/api/weather?type=alerts', auth: false, description: 'Alerts' },
  { module: 'Weather', method: 'GET', path: '/api/weather?type=onecall&lat=40&lon=-74', auth: false, description: 'OneCall' },
  { module: 'Weather', method: 'GET', path: '/api/weather?type=search&search=London', auth: false, description: 'Search' },
  // Live disasters (local)
  { module: 'Live Disasters', method: 'GET', path: '/api/live-disasters', auth: false, description: 'NASA EONET' },
  // Dashboard
  { module: 'Dashboard', method: 'GET', path: '/api/dashboard/stats', auth: true, description: 'Stats' },
  // Ops users
  { module: 'Ops Users', method: 'GET', path: '/api/ops-users', auth: true, description: 'List' },
  { module: 'Ops Users', method: 'GET', path: '/api/ops-users/me', auth: true, description: 'Me' },
  { module: 'Ops Users', method: 'GET', path: '/api/ops-users?limit=5', auth: true, description: 'List with limit' },
  // Admin users (external)
  { module: 'Admin Users', method: 'GET', path: '/api/admin/users?page=1&limit=5', auth: true, description: 'List' },
  { module: 'Admin Users', method: 'GET', path: '/api/external/admin/users?limit=5', auth: true, description: 'External list' },
  // Volunteers
  { module: 'Volunteers', method: 'GET', path: '/api/volunteers', auth: true, description: 'List' },
  { module: 'Volunteers', method: 'GET', path: '/api/volunteers?limit=10', auth: true, description: 'List limited' },
  { module: 'Volunteers', method: 'POST', path: '/api/volunteers', body: { volunteerId: 'test-v-1', firstName: 'Test', lastName: 'Vol', email: 'vol@test.com', phone: '+1234567890' }, auth: true, description: 'Create' },
  { module: 'Volunteers', method: 'GET', path: '/api/volunteers/seed', auth: true, description: 'Seed' },
  // Disasters
  { module: 'Disasters', method: 'GET', path: '/api/disasters', auth: true, description: 'List' },
  { module: 'Disasters', method: 'GET', path: '/api/disasters?limit=10', auth: true, description: 'List limited' },
  { module: 'Disasters', method: 'POST', path: '/api/disasters', body: { title: 'Test Disaster', type: 'flood', description: 'Test', status: 'active', severity: 'medium' }, auth: true, description: 'Create' },
  { module: 'Disasters', method: 'GET', path: '/api/disasters/non-existent-id-12345', auth: true, description: 'Get one (expect 404)' },
  // Emergencies
  { module: 'Emergencies', method: 'GET', path: '/api/emergencies', auth: true, description: 'List' },
  { module: 'Emergencies', method: 'POST', path: '/api/emergencies', body: { title: 'Test Emergency', type: 'medical', description: 'Test', status: 'active', severity: 'high' }, auth: true, description: 'Create' },
  // Shelters
  { module: 'Shelters', method: 'GET', path: '/api/shelters', auth: true, description: 'List' },
  { module: 'Shelters', method: 'GET', path: '/api/shelters/init', auth: true, description: 'Init' },
  { module: 'Shelters', method: 'POST', path: '/api/shelters', body: { name: 'Test Shelter', address: '123 Test St', capacity: 50, currentOccupancy: 0, status: 'active' }, auth: true, description: 'Create' },
  { module: 'Shelters', method: 'GET', path: '/api/shelters/seed', auth: true, description: 'Seed' },
  // Devices
  { module: 'Devices', method: 'GET', path: '/api/devices', auth: true, description: 'List' },
  { module: 'Devices', method: 'POST', path: '/api/devices', body: { deviceId: 'test-dev-1', name: 'Test Device', type: 'sensor', status: 'active' }, auth: true, description: 'Create' },
  { module: 'Devices', method: 'POST', path: '/api/devices/seed', auth: true, description: 'Seed' },
  // Incidents
  { module: 'Incidents', method: 'GET', path: '/api/incidents', auth: true, description: 'List' },
  { module: 'Incidents', method: 'POST', path: '/api/incidents', body: { title: 'Test Incident', type: 'safety', description: 'Test', status: 'open', severity: 'medium' }, auth: true, description: 'Create' },
  { module: 'Incidents', method: 'POST', path: '/api/incidents/seed', auth: true, description: 'Seed' },
  // Inventory
  { module: 'Inventory', method: 'GET', path: '/api/inventory/items', auth: true, description: 'List items' },
  { module: 'Inventory', method: 'GET', path: '/api/inventory/locations', auth: true, description: 'List locations' },
  { module: 'Inventory', method: 'GET', path: '/api/inventory/stock', auth: true, description: 'List stock' },
  { module: 'Inventory', method: 'POST', path: '/api/inventory/seed', auth: true, description: 'Seed' },
  // Damage reports
  { module: 'Damage Reports', method: 'GET', path: '/api/damage-reports', auth: true, description: 'List' },
  { module: 'Damage Reports', method: 'GET', path: '/api/damage-reports?limit=5', auth: true, description: 'List limited' },
  { module: 'Damage Reports', method: 'POST', path: '/api/damage-reports/seed', auth: true, description: 'Seed' },
  // Adjusters
  { module: 'Adjusters', method: 'GET', path: '/api/adjusters', auth: true, description: 'List' },
  { module: 'Adjusters', method: 'POST', path: '/api/adjusters', body: { name: 'Test Adjuster', email: 'adj@test.com', phone: '+1234567890', licenseNumber: 'LIC001' }, auth: true, description: 'Create' },
  { module: 'Adjusters', method: 'POST', path: '/api/adjusters/seed', auth: true, description: 'Seed' },
  // Volunteer teams
  { module: 'Volunteer Teams', method: 'GET', path: '/api/volunteer-teams', auth: true, description: 'List' },
  { module: 'Volunteer Teams', method: 'POST', path: '/api/volunteer-teams', body: { name: 'Test Team', description: 'Test' }, auth: true, description: 'Create' },
  // Products
  { module: 'Products', method: 'GET', path: '/api/products', auth: true, description: 'List' },
  { module: 'Products', method: 'GET', path: '/api/products?status=active&limit=10', auth: true, description: 'List active' },
  { module: 'Products', method: 'POST', path: '/api/products', body: { name: 'Test Product', sku: 'SKU-TEST-1', price: 10, stock: 100, status: 'active' }, auth: true, description: 'Create' },
  // Orders
  { module: 'Orders', method: 'GET', path: '/api/orders', auth: true, description: 'List' },
  { module: 'Orders', method: 'GET', path: '/api/orders?limit=5', auth: true, description: 'List limited' },
  // Services
  { module: 'Services', method: 'GET', path: '/api/services', auth: true, description: 'List' },
  { module: 'Services', method: 'GET', path: '/api/services?limit=5', auth: true, description: 'List limited' },
  { module: 'Category Documents', method: 'GET', path: '/api/category-documents', auth: true, description: 'List' },
  // Reports
  { module: 'Reports', method: 'GET', path: '/api/reports', auth: true, description: 'List' },
  { module: 'Reports', method: 'GET', path: '/api/reports?type=summary', auth: true, description: 'Summary' },
  { module: 'Reports', method: 'POST', path: '/api/reports', body: { title: 'Test Report', type: 'disaster', content: 'Test' }, auth: true, description: 'Create' },
  // Search
  { module: 'Search', method: 'GET', path: '/api/search?q=test', auth: true, description: 'Search' },
  // Currency
  { module: 'Currency', method: 'GET', path: '/api/currency', auth: false, description: 'Currency' },
  { module: 'Currency', method: 'GET', path: '/api/currency?type=list', auth: false, description: 'Currency list' },
  // Customers (may need auth)
  { module: 'Customers', method: 'GET', path: '/api/customers?limit=5', auth: true, description: 'List' },
  // Tracking (proxy to backend)
  { module: 'Tracking', method: 'GET', path: '/api/tracking/location/all', auth: true, description: 'All locations' },
  { module: 'Tracking', method: 'GET', path: '/api/tracking/location/history/test-user-id?limit=10', auth: true, description: 'History' },
];

interface Result {
  module: string;
  method: Method;
  path: string;
  description?: string;
  status: number;
  ok: boolean;
  hasData: boolean;
  errorMessage?: string;
  note?: string;
}

async function runOne(test: TestCase, token: string | null): Promise<Result> {
  const url = `${BASE}${test.path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (test.auth && token) headers['Authorization'] = `Bearer ${token}`;

  let status = 0;
  let ok = false;
  let hasData = false;
  let errorMessage: string | undefined;
  let note: string | undefined;

  try {
    const res = await fetch(url, {
      method: test.method,
      headers,
      body: test.body ? JSON.stringify(test.body) : undefined,
    });
    status = res.status;
    ok = res.ok;
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // non-JSON response
    }
    const obj = data as Record<string, unknown> | null;
    if (obj && typeof obj === 'object') {
      if (obj.success === true && obj.data !== undefined) hasData = true;
      else if (Array.isArray(obj) && obj.length >= 0) hasData = true;
      else if (obj.success === false && obj.error) errorMessage = String(obj.error);
      else if (status >= 400 && (obj.message || obj.error)) errorMessage = String(obj.message || obj.error);
    }
    if (test.auth && !token) note = 'No token (login first)';
    if (status === 401) note = 'Unauthorized – invalid or missing token';
    if (status === 404) note = 'Not found (expected for get-by-id with fake id)';
    if (status === 502 || status === 503) note = 'Backend unreachable or not configured';
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    note = 'Request failed (network or CORS)';
  }

  return {
    module: test.module,
    method: test.method,
    path: test.path,
    description: test.description,
    status,
    ok,
    hasData,
    errorMessage,
    note,
  };
}

async function main() {
  let token: string | null = null;
  const loginTest = TESTS.find((t) => t.path === '/api/auth/login' && t.method === 'POST');
  if (loginTest?.body) {
    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginTest.body),
      });
      const data = (await res.json()) as { token?: string; data?: { token?: string } };
      token = data?.token ?? data?.data?.token ?? null;
    } catch {
      console.warn('Login failed, protected endpoints will show 401.');
    }
  }

  const results: Result[] = [];
  for (const test of TESTS) {
    if (test.path === '/api/auth/login') {
      const r = await runOne(test, null);
      if (r.ok && r.hasData) {
        const res = await fetch(`${BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginTest!.body),
        });
        const data = (await res.json()) as { token?: string; data?: { token?: string } };
        token = data?.token ?? data?.data?.token ?? null;
      }
      results.push(r);
      continue;
    }
    const r = await runOne(test, token);
    results.push(r);
  }

  const failed = results.filter((r) => !r.ok || (!r.hasData && r.status === 200));
  const byModule = new Map<string, Result[]>();
  for (const r of results) {
    if (!byModule.has(r.module)) byModule.set(r.module, []);
    byModule.get(r.module)!.push(r);
  }

  const md: string[] = [];
  md.push('# API Test Results');
  md.push('');
  md.push('Generated by `npx tsx scripts/test-all-apis.ts` against the dashboard app. Base URL: `' + BASE + '`.');
  md.push('');
  md.push('## Summary');
  md.push('');
  md.push('| Total | Passed (OK + data) | Failed / No data / Error |');
  md.push('|-------|--------------------|---------------------------|');
  const passed = results.filter((r) => r.ok && (r.hasData || r.status === 204 || r.status === 401));
  const failedCount = results.length - passed.length;
  md.push('| ' + results.length + ' | ' + passed.length + ' | ' + failedCount + ' |');
  md.push('');
  md.push('## APIs with errors or not returning data (for backend developer)');
  md.push('');
  md.push('The following endpoints returned non-2xx status, no data where expected, or an error message. These need backend fixes or configuration.');
  md.push('');
  md.push('| Module | Method | Path | Status | Has data? | Error / Note |');
  md.push('|--------|--------|------|--------|-----------|---------------|');
  for (const r of failed) {
    const err = [r.errorMessage, r.note].filter(Boolean).join('; ') || '-';
    md.push('| ' + r.module + ' | ' + r.method + ' | `' + r.path + '` | ' + r.status + ' | ' + (r.hasData ? 'Yes' : 'No') + ' | ' + err + ' |');
  }
  md.push('');
  md.push('## All results by module');
  md.push('');
  for (const [module, arr] of Array.from(byModule.entries()).sort()) {
    md.push('### ' + module);
    md.push('');
    md.push('| Method | Path | Status | OK | Data? | Note |');
    md.push('|--------|------|--------|-----|-------|------|');
    for (const r of arr) {
      const note = [r.errorMessage, r.note].filter(Boolean).join('; ') || '-';
      md.push('| ' + r.method + ' | `' + r.path + '` | ' + r.status + ' | ' + (r.ok ? 'Yes' : 'No') + ' | ' + (r.hasData ? 'Yes' : 'No') + ' | ' + note + ' |');
    }
    md.push('');
  }
  md.push('---');
  md.push('*Auth: Login was attempted with LOGIN_EMAIL / LOGIN_PASSWORD env or defaults. Protected routes use the returned JWT.*');

  const outPath = 'docs/API-TEST-RESULTS.md';
  const fs = await import('fs');
  fs.writeFileSync(outPath, md.join('\n'), 'utf8');
  console.log('Written ' + outPath);
  console.log('Failed / no data: ' + failed.length);
  failed.forEach((r) => console.log('  ' + r.method + ' ' + r.path + ' -> ' + r.status + ' ' + (r.errorMessage || r.note || '')));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
