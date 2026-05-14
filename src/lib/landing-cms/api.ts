// API helper functions for Landing Content CMS

import type {
  SectionsListResponse,
  SectionDetailResponse,
  SaveSectionResponse,
  SeedResponse,
  UploadResponse,
} from './types';

const getHeaders = (token: string | null): Record<string, string> => {
  const h: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
};

/** GET /api/admin/landing-content/sections-list */
export async function fetchSectionsList(token: string | null): Promise<SectionsListResponse> {
  const res = await fetch('/api/admin/landing-content/sections-list', {
    headers: getHeaders(token),
    cache: 'no-store',
  });
  return res.json();
}

/** GET /api/admin/landing-content/:page/:section */
export async function fetchSectionDetail(
  page: string,
  section: string,
  token: string | null
): Promise<SectionDetailResponse> {
  const res = await fetch(`/api/admin/landing-content/${page}/${section}`, {
    headers: getHeaders(token),
    cache: 'no-store',
  });
  return res.json();
}

/** PUT /api/admin/landing-content/:page/:section (full replace) */
export async function saveSectionFull(
  page: string,
  section: string,
  content: Record<string, unknown>,
  sortOrder: number,
  token: string | null
): Promise<SaveSectionResponse> {
  const res = await fetch(`/api/admin/landing-content/${page}/${section}`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify({ content, sortOrder }),
  });
  return res.json();
}

/** PATCH /api/admin/landing-content/:page/:section (partial merge) */
export async function patchSection(
  page: string,
  section: string,
  content: Record<string, unknown>,
  token: string | null
): Promise<SaveSectionResponse> {
  const res = await fetch(`/api/admin/landing-content/${page}/${section}`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify({ content }),
  });
  return res.json();
}

/** POST /api/cms/seed-landing (local route that reads JSON and bulk upserts) */
export async function seedLandingContent(token: string | null): Promise<SeedResponse> {
  const res = await fetch('/api/cms/seed-landing', {
    method: 'POST',
    headers: getHeaders(token),
  });
  return res.json();
}

/** POST /api/admin/landing-content/upload (multipart file upload) */
export async function uploadMedia(
  file: File,
  page: string,
  section: string,
  token: string | null,
  oldUrl?: string,
  key?: string
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('page', page);
  formData.append('section', section);
  if (oldUrl) formData.append('oldUrl', oldUrl);
  if (key) formData.append('key', key);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch('/api/admin/landing-content/upload', {
    method: 'POST',
    headers,
    body: formData,
  });
  return res.json();
}

/** DELETE /api/admin/landing-content/:page/:section */
export async function deleteSection(
  page: string,
  section: string,
  token: string | null
): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`/api/admin/landing-content/${page}/${section}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  return res.json();
}

/** GET /api/landing-content/full (public - no auth) */
export async function fetchFullSiteContent(): Promise<{ success: boolean; data: Record<string, unknown> }> {
  const res = await fetch('/api/landing-content/full', { cache: 'no-store' });
  return res.json();
}
