// src/app/api/public/maintenance/route.ts
// Public API - No auth required. Used by results.org middleware to check maintenance state.

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'src', 'data', 'maintenance-config.json');

const DEFAULT_CONFIG = {
  globalMaintenance: false,
  routes: {},
};

export async function GET(_req: NextRequest) {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(raw);
    return NextResponse.json(
      { success: true, globalMaintenance: config.globalMaintenance, routes: config.routes },
      { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch {
    return NextResponse.json(
      { success: true, globalMaintenance: false, routes: {} },
      { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
