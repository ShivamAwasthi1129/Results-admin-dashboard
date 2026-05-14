import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/landing-cms/proxy-helper';

export async function GET(req: NextRequest, context: { params: { path: string[] } }) {
  return proxyToBackend(req, context);
}

// Support other methods if needed (though public usually only GET)
export async function POST(req: NextRequest, context: { params: { path: string[] } }) {
  return proxyToBackend(req, context);
}
