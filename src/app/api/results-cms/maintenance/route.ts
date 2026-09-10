// src/app/api/results-cms/maintenance/route.ts
// Private API: GET and POST for the admin dashboard Maintenance Page UI

import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'src', 'data', 'maintenance-config.json');

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

async function readConfig() {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function GET(_req: NextRequest) {
  try {
    const config = await readConfig();
    return NextResponse.json({ success: true, config }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = await readConfig();

    const updated = {
      globalMaintenance: typeof body.globalMaintenance === 'boolean'
        ? body.globalMaintenance
        : current.globalMaintenance,
      routes: { ...current.routes, ...(body.routes || {}) },
      updatedAt: new Date().toISOString(),
      updatedBy: body.updatedBy || 'admin',
    };

    await writeFile(CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf-8');

    // Sync with local client app (results.org) if running on the same local environment
    try {
      const clientConfigPath = path.join(process.cwd(), '..', 'results.org', 'maintenance-config.json');
      await writeFile(
        clientConfigPath,
        JSON.stringify({ globalMaintenance: updated.globalMaintenance, routes: updated.routes }, null, 2),
        'utf-8'
      );
    } catch {
      // Ignore if results.org is not in parent directory
    }

    return NextResponse.json({ success: true, config: updated });
  } catch (error: any) {
    console.error('[maintenance POST]', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
