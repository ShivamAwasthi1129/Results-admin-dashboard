/**
 * Maps frontend /api/* path segments to backend API path prefixes.
 * Used by the catch-all proxy so all backend-proxied APIs work in dev and production.
 * Matches next.config.mjs rewrites.
 */
const BACKEND_PATH_MAP: Record<string, string> = {
  volunteers: '/api/admin/volunteer-mgmt',
  users: '/api/admin/users-mgmt',
  dashboard: '/api/admin/dashboard',
  'ops-users': '/api/admin/ops-users',
  disasters: '/api/admin/disasters',
  emergencies: '/api/admin/emergencies',
  shelters: '/api/admin/shelters',
  devices: '/api/admin/devices',
  incidents: '/api/admin/incidents',
  inventory: '/api/admin/inventory',
  'damage-reports': '/api/admin/damage-reports',
  adjusters: '/api/admin/adjusters',
  'volunteer-teams': '/api/admin/volunteer-teams',
  products: '/api/admin/products',
  orders: '/api/admin/orders',
  services: '/api/admin/services',
  'category-documents': '/api/admin/services',
  reports: '/api/admin/reports',
  search: '/api/admin/search',
  seed: '/api/admin/seed',
  mobile: '/api/admin/mobile',
};

/** First path segments that have their own route handlers - do not proxy in catch-all */
const LOCAL_API_PREFIXES = new Set([
  'admin',
  'external',
  'customers',
  'currency',
  'tracking',
  'geofence',
  'weather',
  'live-disasters',
  'resource-locator',
  'user',
  'auth',
]);

/**
 * Returns backend path prefix for the given path segments, or null if this request
 * should be handled by a local route (or unknown path).
 */
export function getBackendPathForSegments(pathSegments: string[]): string | null {
  if (!Array.isArray(pathSegments) || pathSegments.length === 0) return null;
  const first = pathSegments[0];
  if (LOCAL_API_PREFIXES.has(first)) return null;
  const backendPrefix = BACKEND_PATH_MAP[first];
  if (!backendPrefix) return null;
  const rest = pathSegments.slice(1);
  const restPath = rest.length > 0 ? `/${rest.join('/')}` : '';
  return `${backendPrefix}${restPath}`;
}
