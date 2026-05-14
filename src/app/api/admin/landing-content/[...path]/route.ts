import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/landing-cms/proxy-helper';

export async function GET(req: NextRequest, context: { params: { path: string[] } }) {
  return proxyToBackend(req, context);
}

export async function PUT(req: NextRequest, context: { params: { path: string[] } }) {
  return proxyToBackend(req, context);
}

export async function PATCH(req: NextRequest, context: { params: { path: string[] } }) {
  return proxyToBackend(req, context);
}

export async function POST(req: NextRequest, context: { params: { path: string[] } }) {
  return proxyToBackend(req, context);
}

export async function DELETE(req: NextRequest, context: { params: { path: string[] } }) {
  return proxyToBackend(req, context);
}
