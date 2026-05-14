import { NextRequest, NextResponse } from 'next/server';

/**
 * Robust proxy for backend landing content API.
 * Forces no-store caching to ensure changes are immediately visible.
 */
export async function proxyToBackend(req: NextRequest, { params }: { params: { path: string[] } }) {
  const backend = process.env.DOMAIN_NAME || 'https://r3sults-backend.vercel.app';
  const path = params.path.join('/');
  
  // Detect if this is an admin or public request based on the URL
  const isAdmin = req.nextUrl.pathname.startsWith('/api/admin');
  const targetUrl = isAdmin 
    ? `${backend}/api/admin/landing-content/${path}`
    : `${backend}/api/landing-content/${path}`;

  const headers = new Headers(req.headers);
  // Important: Remove host header so backend doesn't get confused
  headers.delete('host');

  try {
    const res = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.blob() : undefined,
      cache: 'no-store', // FORCE NO CACHE
    });

    const data = await res.json();
    
    // Add a debug header so the user can verify they are hitting the proxy
    const response = NextResponse.json(data, { status: res.status });
    response.headers.set('X-Proxy-Destination', targetUrl);
    response.headers.set('X-Proxy-Cache', 'no-store');
    
    return response;
  } catch (error: any) {
    console.error(`Proxy error for ${targetUrl}:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
