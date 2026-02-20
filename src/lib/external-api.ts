/**
 * Single source for the R3sults external API base URL.
 * Set DOMAIN_NAME in env (e.g. https://r3sults-backend.vercel.app).
 * Used by tracking and user-management proxy routes.
 */
export function getExternalApiBaseUrl(): string | null {
  const raw = process.env.DOMAIN_NAME;
  if (!raw || typeof raw !== 'string') return null;
  return raw.replace(/\/$/, '');
}

export function getExternalTrackingUrl(path: string): string | null {
  const base = getExternalApiBaseUrl();
  if (!base) return null;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

export function getExternalAdminUsersUrl(queryString?: string): string | null {
  const base = getExternalApiBaseUrl();
  if (!base) return null;
  const q = queryString?.replace(/^\?/, '') || '';
  return `${base}/api/admin/users${q ? `?${q}` : ''}`;
}
