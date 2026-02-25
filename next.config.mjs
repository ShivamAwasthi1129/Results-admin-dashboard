/** @type {import('next').NextConfig} */
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
    return [
      { source: '/api/auth/:path*', destination: 'http://localhost:5001/api/admin-auth/:path*' },
      { source: '/api/volunteers/:path*', destination: 'http://localhost:5001/api/admin/volunteer-mgmt/:path*' },
      { source: '/api/users/:path*', destination: 'http://localhost:5001/api/admin/users-mgmt/:path*' },
      { source: '/api/dashboard/:path*', destination: 'http://localhost:5001/api/admin/dashboard/:path*' },
      { source: '/api/ops-users/:path*', destination: 'http://localhost:5001/api/admin/ops-users/:path*' },
      { source: '/api/disasters/:path*', destination: 'http://localhost:5001/api/admin/disasters/:path*' },
      { source: '/api/emergencies/:path*', destination: 'http://localhost:5001/api/admin/emergencies/:path*' },
      { source: '/api/shelters/:path*', destination: 'http://localhost:5001/api/admin/shelters/:path*' },
      { source: '/api/devices/:path*', destination: 'http://localhost:5001/api/admin/devices/:path*' },
      { source: '/api/incidents/:path*', destination: 'http://localhost:5001/api/admin/incidents/:path*' },
      { source: '/api/inventory/:path*', destination: 'http://localhost:5001/api/admin/inventory/:path*' },
      { source: '/api/damage-reports/:path*', destination: 'http://localhost:5001/api/admin/damage-reports/:path*' },
      { source: '/api/adjusters/:path*', destination: 'http://localhost:5001/api/admin/adjusters/:path*' },
      { source: '/api/volunteer-teams/:path*', destination: 'http://localhost:5001/api/admin/volunteer-teams/:path*' },
      { source: '/api/products/:path*', destination: 'http://localhost:5001/api/admin/products/:path*' },
      { source: '/api/orders/:path*', destination: 'http://localhost:5001/api/admin/orders/:path*' },
      { source: '/api/services/:path*', destination: 'http://localhost:5001/api/admin/services/:path*' },
      { source: '/api/category-documents/:path*', destination: 'http://localhost:5001/api/admin/services/:path*' },
      { source: '/api/reports/:path*', destination: 'http://localhost:5001/api/admin/reports/:path*' },
      { source: '/api/search/:path*', destination: 'http://localhost:5001/api/admin/search/:path*' },
      { source: '/api/seed/:path*', destination: 'http://localhost:5001/api/admin/seed/:path*' },
      { source: '/api/mobile/:path*', destination: 'http://localhost:5001/api/admin/mobile/:path*' },
      { source: '/api/:path*', destination: 'http://localhost:5001/api/:path*' }
    ];
  },
};

export default nextConfig;
