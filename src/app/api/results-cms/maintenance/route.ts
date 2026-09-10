import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  updatedAt: null,
  updatedBy: null,
};

async function readConfig() {
  const setting = await prisma.systemSetting.findUnique({
    where: { id: 'maintenance_config' },
  });
  return setting ? (setting.value as any) : DEFAULT_CONFIG;
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
    const current: any = await readConfig();

    const updated = {
      globalMaintenance:
        typeof body.globalMaintenance === 'boolean'
          ? body.globalMaintenance
          : current?.globalMaintenance,
      routes: { ...(current?.routes || {}), ...(body.routes || {}) },
      updatedAt: new Date().toISOString(),
      updatedBy: body.updatedBy || 'admin',
    };

    await prisma.systemSetting.upsert({
      where: { id: 'maintenance_config' },
      update: { value: updated },
      create: { id: 'maintenance_config', value: updated },
    });

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
