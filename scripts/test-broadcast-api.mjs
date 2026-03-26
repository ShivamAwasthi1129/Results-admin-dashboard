/**
 * Test Broadcast API (list, get by id, create).
 * Uses DOMAIN_NAME from .env.local / .env. Auth: set AUTH_TOKEN (Bearer).
 *
 * Run:
 *   node scripts/test-broadcast-api.mjs
 *   $env:AUTH_TOKEN="your-token"; node scripts/test-broadcast-api.mjs   (PowerShell)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const path = resolve(root, file);
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf8');
      for (const line of content.split('\n')) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (m && !process.env[m[1]]) {
          const val = m[2].replace(/^["']|["']$/g, '').trim();
          process.env[m[1]] = val;
        }
      }
    }
  }
}
loadEnv();

const DOMAIN_NAME =
  process.env.NEXT_PUBLIC_DOMAIN_NAME ||
  process.env.DOMAIN_NAME ||
  'https://r3sults-backend.vercel.app';
const BASE = DOMAIN_NAME.replace(/\/$/, '');
const AUTH = process.env.AUTH_TOKEN;

function log(msg) {
  console.log(msg);
}

async function request(method, path, body = null) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (AUTH) opts.headers['Authorization'] = `Bearer ${AUTH}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  log('DOMAIN_NAME: ' + DOMAIN_NAME);
  log('AUTH_TOKEN: ' + (AUTH ? 'set' : 'not set'));
  log('');

  // 1. List broadcasts
  log('1. GET /api/admin/broadcast?page=1&limit=10');
  const listRes = await request('GET', '/api/admin/broadcast?page=1&limit=10');
  if (!listRes.ok) {
    log('   FAIL ' + listRes.status + ' ' + JSON.stringify(listRes.data));
    if (listRes.status === 401) log('   Tip: Set AUTH_TOKEN (Bearer) from app login.');
    return;
  }
  const broadcasts = listRes.data?.data?.broadcasts ?? [];
  const pagination = listRes.data?.data?.pagination ?? {};
  log('   OK. broadcasts: ' + broadcasts.length + ', pagination: ' + JSON.stringify(pagination));

  // 2. Get by ID if we have one
  if (broadcasts.length > 0) {
    const id = broadcasts[0].id;
    log('\n2. GET /api/admin/broadcast/' + id);
    const getRes = await request('GET', '/api/admin/broadcast/' + id);
    if (getRes.ok) {
      log('   OK. broadcast: ' + (getRes.data?.data?.broadcast?.title ?? 'N/A'));
    } else {
      log('   FAIL ' + getRes.status + ' ' + JSON.stringify(getRes.data));
    }
  } else {
    log('\n2. Skip GET by ID (no broadcasts)');
  }

  // 3. Create broadcast
  log('\n3. POST /api/admin/broadcast (create)');
  const createBody = {
    latitude: 28.6139,
    longitude: 77.209,
    radius: 5000,
    title: 'Test Storm Warning',
    description: 'Heavy storm approaching the area (script test)',
  };
  const createRes = await request('POST', '/api/admin/broadcast', createBody);
  if (createRes.ok) {
    log('   OK. created: ' + (createRes.data?.data?.broadcast?.id ?? createRes.data?.message ?? 'OK'));
  } else {
    log('   FAIL ' + createRes.status + ' ' + JSON.stringify(createRes.data));
  }

  // 4. List with filters
  log('\n4. GET /api/admin/broadcast?page=1&limit=5&search=storm');
  const searchRes = await request('GET', '/api/admin/broadcast?page=1&limit=5&search=storm');
  if (searchRes.ok) {
    const list = searchRes.data?.data?.broadcasts ?? [];
    log('   OK. found: ' + list.length);
  } else {
    log('   FAIL ' + searchRes.status);
  }

  log('\nDone. Broadcast API test complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
