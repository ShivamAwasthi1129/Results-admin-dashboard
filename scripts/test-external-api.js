/**
 * Test that DOMAIN_NAME and R3SULTS_ACCESS_TOKEN are set and that
 * the external R3sults API (admin users + tracking location/all) returns data.
 * Run: node scripts/test-external-api.js
 * Requires: DOMAIN_NAME and R3SULTS_ACCESS_TOKEN in .env.local (or .env)
 */
const path = require('path');
const fs = require('fs');

// Load .env.local first, then .env
const envLocal = path.join(__dirname, '..', '.env.local');
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envLocal)) {
  require('dotenv').config({ path: envLocal });
} else if (fs.existsSync(envFile)) {
  require('dotenv').config({ path: envFile });
} else {
  require('dotenv').config();
}

const DOMAIN_NAME = process.env.DOMAIN_NAME?.replace(/\/$/, '');
const R3SULTS_ACCESS_TOKEN = process.env.R3SULTS_ACCESS_TOKEN;

function log(msg) {
  console.log(msg);
}

function err(msg) {
  console.error(msg);
}

async function testAdminUsers() {
  if (!DOMAIN_NAME) {
    err('[FAIL] DOMAIN_NAME is not set. Set DOMAIN_NAME=https://r3sults-backend.vercel.app in .env.local');
    return false;
  }
  const url = `${DOMAIN_NAME}/api/admin/users`;
  log(`[TEST] GET ${url}`);
  const headers = { 'Content-Type': 'application/json' };
  if (R3SULTS_ACCESS_TOKEN) headers['Authorization'] = `Bearer ${R3SULTS_ACCESS_TOKEN}`;
  try {
    const res = await fetch(url, { method: 'GET', headers });
    const text = await res.text();
    if (!res.ok) {
      err(`[FAIL] Admin users API returned ${res.status}: ${text.slice(0, 200)}`);
      return false;
    }
    const data = JSON.parse(text);
    if (!data.success) {
      err(`[FAIL] Admin users API success=false: ${data.error || data.message || ''}`);
      return false;
    }
    const count = data.data?.users?.length ?? 0;
    log(`[OK] Admin users API: success, users count = ${count}`);
    return true;
  } catch (e) {
    err(`[FAIL] Admin users API request error: ${e.message}`);
    return false;
  }
}

async function testTrackingLocationAll() {
  if (!DOMAIN_NAME) {
    err('[FAIL] DOMAIN_NAME is not set.');
    return false;
  }
  const url = `${DOMAIN_NAME}/api/tracking/location/all`;
  log(`[TEST] GET ${url}`);
  const headers = { 'Content-Type': 'application/json' };
  if (R3SULTS_ACCESS_TOKEN) headers['Authorization'] = `Bearer ${R3SULTS_ACCESS_TOKEN}`;
  try {
    const res = await fetch(url, { method: 'GET', headers });
    const text = await res.text();
    if (!res.ok) {
      err(`[FAIL] Tracking location/all API returned ${res.status}: ${text.slice(0, 200)}`);
      return false;
    }
    const data = JSON.parse(text);
    if (!data.success) {
      err(`[FAIL] Tracking API success=false: ${data.error || data.message || ''}`);
      return false;
    }
    const count = data.data?.locations?.length ?? 0;
    log(`[OK] Tracking location/all API: success, locations count = ${count}`);
    return true;
  } catch (e) {
    err(`[FAIL] Tracking API request error: ${e.message}`);
    return false;
  }
}

const TEST_USER_ID = 'cmlmezee4000004jme0hypv1g';

async function testTrackingHistory() {
  if (!DOMAIN_NAME) {
    err('[FAIL] DOMAIN_NAME is not set.');
    return false;
  }
  const token = process.env.TEST_AUTH_TOKEN || R3SULTS_ACCESS_TOKEN;
  if (!token) {
    log('[SKIP] Tracking history: set TEST_AUTH_TOKEN or R3SULTS_ACCESS_TOKEN in .env.local to test (use same JWT as in app localStorage).');
    return true;
  }
  const url = `${DOMAIN_NAME}/api/tracking/location/history/${TEST_USER_ID}?limit=20`;
  log(`[TEST] GET ${url}`);
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  try {
    const res = await fetch(url, { method: 'GET', headers });
    const text = await res.text();
    if (!res.ok) {
      err(`[FAIL] Tracking history API returned ${res.status}: ${text.slice(0, 200)}`);
      return false;
    }
    const data = JSON.parse(text);
    if (!data.success) {
      err(`[FAIL] Tracking history API success=false: ${data.error || data.message || ''}`);
      return false;
    }
    const history = data.data?.history ?? [];
    const total = data.data?.pagination?.total ?? history.length;
    log(`[OK] Tracking history API: success, history length = ${history.length}, total = ${total}`);
    return true;
  } catch (e) {
    err(`[FAIL] Tracking history request error: ${e.message}`);
    return false;
  }
}

async function main() {
  log('--- External API test (DOMAIN_NAME from env) ---');
  log(`DOMAIN_NAME = ${DOMAIN_NAME || '(not set)'}`);
  log(`R3SULTS_ACCESS_TOKEN = ${R3SULTS_ACCESS_TOKEN ? '(set)' : '(not set)'}`);
  log('');

  const r1 = await testAdminUsers();
  log('');
  const r2 = await testTrackingLocationAll();
  log('');
  const r3 = await testTrackingHistory();

  log('');
  if (r1 && r2 && r3) {
    log('All tests passed. User Management, Live Tracking, and Location History use ' + DOMAIN_NAME);
    process.exit(0);
  } else {
    if (DOMAIN_NAME && !R3SULTS_ACCESS_TOKEN) {
      err('DOMAIN_NAME is correct (' + DOMAIN_NAME + '). Set R3SULTS_ACCESS_TOKEN in .env.local (get token from R3sults backend admin login).');
      err('On Vercel: set both DOMAIN_NAME and R3SULTS_ACCESS_TOKEN in Project Settings > Environment Variables.');
    } else if (!DOMAIN_NAME) {
      err('Set DOMAIN_NAME=https://r3sults-backend.vercel.app in .env.local');
    }
    process.exit(1);
  }
}

main();
