// src/app/api/public/maintenance/route.ts
// Public API - No auth required. Used by results.org middleware to check maintenance state.

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import os from 'os';

const BUNDLED_PATH = path.join(process.cwd(), 'src', 'data', 'maintenance-config.json');
const TMP_PATH = path.join(os.tmpdir(), 'maintenance-config.json');

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

  return { globalMaintenance: false, routes: {} };
}

export async function GET(_req: NextRequest) {
  try {
    const config = await readConfig();
    return NextResponse.json(
      { success: true, globalMaintenance: !!config.globalMaintenance, routes: config.routes || {} },
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
