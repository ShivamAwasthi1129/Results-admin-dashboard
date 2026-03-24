/** @type {import('next').NextConfig} */
// Backend base URL from env (e.g. https://r3sults-backend.vercel.app) - no trailing slash, no http:// prefix
const getBackendUrl = () => {
  const raw = process.env.DOMAIN_NAME || 'https://r3sults-backend.vercel.app';
  return raw.replace(/\/$/, '');
};

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdnjs.cloudflare.com',
      },
    ],
  },
  async rewrites() {
    const backend = getBackendUrl();
    const allRewrites = [
      { source: '/api/auth/:path*', destination: `${backend}/api/admin-auth/:path*` },
      { source: '/api/volunteers/:path*', destination: `${backend}/api/admin/volunteer-mgmt/:path*` },
      { source: '/api/users/:path*', destination: `${backend}/api/admin/users-mgmt/:path*` },
      { source: '/api/dashboard/:path*', destination: `${backend}/api/admin/dashboard/:path*` },
      { source: '/api/ops-users/:path*', destination: `${backend}/api/admin/ops-users/:path*` },
      { source: '/api/disasters/:path*', destination: `${backend}/api/admin/disasters/:path*` },
      { source: '/api/emergencies/:path*', destination: `${backend}/api/admin/emergencies/:path*` },
      { source: '/api/shelters/:path*', destination: `${backend}/api/admin/shelters/:path*` },
      { source: '/api/devices/:path*', destination: `${backend}/api/admin/devices/:path*` },
      { source: '/api/incidents/:path*', destination: `${backend}/api/admin/incidents/:path*` },
      { source: '/api/inventory/:path*', destination: `${backend}/api/admin/inventory/:path*` },
      { source: '/api/damage-reports/:path*', destination: `${backend}/api/admin/damage-reports/:path*` },
      { source: '/api/adjusters/:path*', destination: `${backend}/api/admin/adjusters/:path*` },
      { source: '/api/volunteer-teams/:path*', destination: `${backend}/api/admin/volunteer-teams/:path*` },
      { source: '/api/products/:path*', destination: `${backend}/api/products/:path*` },
      { source: '/api/orders/:path*', destination: `${backend}/api/admin/orders/:path*` },
      { source: '/api/services/:path*', destination: `${backend}/api/admin/services/:path*` },
      { source: '/api/category-documents/:path*', destination: `${backend}/api/admin/services/:path*` },
      { source: '/api/reports/:path*', destination: `${backend}/api/admin/reports/:path*` },
      { source: '/api/search/:path*', destination: `${backend}/api/admin/search/:path*` },
      { source: '/api/seed/:path*', destination: `${backend}/api/admin/seed/:path*` },
      { source: '/api/mobile/:path*', destination: `${backend}/api/admin/mobile/:path*` },
      { source: '/api/currency', destination: `${backend}/api/currency` },
      // No catch-all so /api/printify/* is never proxied to backend; local routes handle it
    ];
    return {
      beforeFiles: [
        { source: '/api/live-disasters', destination: '/api/live-disasters' },
        { source: '/api/merged-live-disasters', destination: '/api/merged-live-disasters' },
        { source: '/api/adjusters/assign-report', destination: '/api/adjusters/assign-report' },
        // Printify API: handle all printify routes locally (must be one rule so no subpath is sent to backend)
        { source: '/api/printify/:path*', destination: '/api/printify/:path*' }
      ],
      afterFiles: allRewrites
    };
  },
};

export default nextConfig;
