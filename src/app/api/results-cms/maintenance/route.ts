// src/app/api/results-cms/maintenance/route.ts
// Private API: GET and POST for the admin dashboard Maintenance Page UI

import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import os from 'os';

const BUNDLED_PATH = path.join(process.cwd(), 'src', 'data', 'maintenance-config.json');
const TMP_PATH = path.join(os.tmpdir(), 'maintenance-config.json');

const DEFAULT_CONFIG = {
  globalMaintenance: false,
  routes: {
    '/': false,
    '/about': false,
    '/campaigns': false,
    '/disasters': false,
    '/contact': false,
    '/corporate-giving': false,
    '/donation': false,
    '/financials': false,
    '/impact': false,
    '/leadership': false,
    '/partner': false,
    '/preparedness': false,
    '/press': false,
    '/privacy': false,
    '/stories': false,
    '/terms': false,
    '/transparency': false,
    '/volunteer': false,
  },
  updatedAt: null as string | null,
  updatedBy: null as string | null,
};

let inMemoryConfig: any = null;

async function readConfig() {
  if (inMemoryConfig) return inMemoryConfig;

  try {
    const raw = await readFile(TMP_PATH, 'utf-8');
    inMemoryConfig = JSON.parse(raw);
    return inMemoryConfig;
  } catch {}

  try {
    const raw = await readFile(BUNDLED_PATH, 'utf-8');
    inMemoryConfig = JSON.parse(raw);
    return inMemoryConfig;
  } catch {}

  return DEFAULT_CONFIG;
}

async function writeConfig(newConfig: any) {
  inMemoryConfig = newConfig;

  // 1. Write to /tmp (always writable in Vercel / serverless functions)
  try {
    await writeFile(TMP_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[maintenance] Failed to write to /tmp:', err);
  }

  // 2. Write to project src/data/ (works in local dev, fails silently on Vercel read-only FS)
  try {
    await writeFile(BUNDLED_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
  } catch {}
}

export async function GET(_req: NextRequest) {
  try {
    const config = await readConfig();
    return NextResponse.json(
      { success: true, config },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = await readConfig();

    const updated = {
      globalMaintenance:
        typeof body.globalMaintenance === 'boolean'
          ? body.globalMaintenance
          : current.globalMaintenance,
      routes: { ...current.routes, ...(body.routes || {}) },
      updatedAt: new Date().toISOString(),
      updatedBy: body.updatedBy || 'admin',
    };

    await writeConfig(updated);

    // Sync with local client app (results.org) if running on local environment
    try {
      const clientConfigPath = path.join(process.cwd(), '..', 'results.org', 'maintenance-config.json');
      await writeFile(
        clientConfigPath,
        JSON.stringify({ globalMaintenance: updated.globalMaintenance, routes: updated.routes }, null, 2),
        'utf-8'
      );
    } catch {}

    return NextResponse.json({ success: true, config: updated });
  } catch (error: any) {
    console.error('[maintenance POST error]', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
