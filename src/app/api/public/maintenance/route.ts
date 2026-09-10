import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(_req: NextRequest) {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { id: 'maintenance_config' },
    });
    
    const config: any = setting ? setting.value : { globalMaintenance: false, routes: {} };

    return NextResponse.json(
      { success: true, globalMaintenance: !!config?.globalMaintenance, routes: config?.routes || {} },
      { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (err) {
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
