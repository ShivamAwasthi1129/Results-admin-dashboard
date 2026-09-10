const fs = require('fs');
const path = require('path');

const clientDir = path.join(__dirname, '..', '..', 'results.org');

// 1. Update middleware.ts
const middlewarePath = path.join(clientDir, 'middleware.ts');
const newMiddlewareCode = `import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that should NEVER be redirected to maintenance
const BYPASS_PREFIXES = [
  '/admin',
  '/api',
  '/_next',
  '/maintenance',
  '/favicon',
]

const BYPASS_EXTENSIONS = ['.ico', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.woff', '.woff2', '.ttf', '.css', '.js', '.map']

function shouldBypass(pathname: string): boolean {
  if (BYPASS_PREFIXES.some(prefix => pathname.startsWith(prefix))) return true
  if (BYPASS_EXTENSIONS.some(ext => pathname.endsWith(ext))) return true
  return false
}

// Admin dashboard URL — where maintenance config is managed
const ADMIN_DASHBOARD_URL =
  process.env.ADMIN_DASHBOARD_URL ||
  process.env.NEXT_PUBLIC_ADMIN_DASHBOARD_URL ||
  'https://results-admin-dashboard.vercel.app'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip maintenance check for bypassed paths
  if (shouldBypass(pathname)) {
    return NextResponse.next()
  }

  try {
    let config: any = null

    // Determine timeout based on environment (fast 500ms in dev, 1500ms in prod)
    const isDev = process.env.NODE_ENV !== 'production'
    const timeoutMs = isDev ? 500 : 1500

    // Try fetching from configured Admin Dashboard
    try {
      const configRes = await fetch(\`\${ADMIN_DASHBOARD_URL}/api/public/maintenance\`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'Accept': 'application/json' },
      })
      if (configRes.ok) {
        config = await configRes.json()
      }
    } catch {
      // Fallback: If primary fetch fails/times out, fetch from local app maintenance API
      const localUrl = new URL('/api/maintenance', request.url)
      const localRes = await fetch(localUrl.toString(), {
        cache: 'no-store',
        signal: AbortSignal.timeout(500),
        headers: { 'Accept': 'application/json' },
      })
      if (localRes.ok) {
        config = await localRes.json()
      }
    }

    if (config) {
      const maintenanceUrl = new URL('/maintenance', request.url)

      // Check global maintenance
      if (config.globalMaintenance === true) {
        return NextResponse.redirect(maintenanceUrl, 307)
      }

      // Check per-route maintenance
      const normalizedPath = pathname.length > 1 ? pathname.replace(/\\/$/, '') : pathname

      if (config.routes && config.routes[normalizedPath] === true) {
        return NextResponse.redirect(maintenanceUrl, 307)
      }
    }
  } catch (error) {
    console.error('[Middleware] Maintenance check failed:', error)
  }

  return NextResponse.next()
}

export const config = {
  // Match all routes except static files handled by Next.js internals
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
`;

if (fs.existsSync(middlewarePath)) {
  fs.writeFileSync(middlewarePath, newMiddlewareCode, 'utf-8');
  console.log('Successfully updated results.org/middleware.ts');
} else {
  console.error('Could not find results.org/middleware.ts at', middlewarePath);
}

// 2. Update .env.local in results.org
const envPath = path.join(clientDir, '.env.local');
if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, 'utf-8');
  
  if (envContent.includes('ADMIN_DASHBOARD_URL=')) {
    envContent = envContent.replace(/ADMIN_DASHBOARD_URL=.*/g, 'ADMIN_DASHBOARD_URL=http://localhost:3002');
  } else {
    envContent += '\nADMIN_DASHBOARD_URL=http://localhost:3002\n';
  }

  if (envContent.includes('NEXT_PUBLIC_ADMIN_DASHBOARD_URL=')) {
    envContent = envContent.replace(/NEXT_PUBLIC_ADMIN_DASHBOARD_URL=.*/g, 'NEXT_PUBLIC_ADMIN_DASHBOARD_URL=http://localhost:3002');
  } else {
    envContent += '\nNEXT_PUBLIC_ADMIN_DASHBOARD_URL=http://localhost:3002\n';
  }

  fs.writeFileSync(envPath, envContent, 'utf-8');
  console.log('Successfully updated results.org/.env.local to point to http://localhost:3002');
} else {
  console.error('Could not find results.org/.env.local at', envPath);
}
