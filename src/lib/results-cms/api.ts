// API helper functions for Results.org Home Page CMS
// All calls go through local Next.js proxy routes (/api/results-cms/...)
// to avoid CORS and keep the Bearer token server-side.

import type {
  ResultsSectionKey,
  ResultsSectionDetailResponse,
  ResultsSaveResponse,
  ResultsSeedResponse,
  ResultsUploadResponse,
  ResultsMetaResponse,
} from './types';

const getHeaders = (token: string | null): Record<string, string> => {
  const h: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
};

/**
 * GET /api/results-cms/meta
 * Returns CMS metadata (version, sections list, timestamps).
 */
export async function fetchResultsMeta(token: string | null): Promise<ResultsMetaResponse> {
  const res = await fetch('/api/results-cms/meta', {
    headers: getHeaders(token),
    cache: 'no-store',
  });
  return res.json();
}

/**
 * GET /api/results-cms/:section
 * Returns full content for a single section.
 */
export async function fetchResultsSection(
  section: ResultsSectionKey,
  token: string | null
): Promise<ResultsSectionDetailResponse> {
  const res = await fetch(`/api/results-cms/${section}`, {
    headers: getHeaders(token),
    cache: 'no-store',
  });
  return res.json();
}

/**
 * PATCH /api/results-cms/:section
 * Deep-merges only the provided fields. ⭐ Primary update method.
 */
export async function patchResultsSection(
  section: ResultsSectionKey,
  fields: Record<string, unknown>,
  token: string | null
): Promise<ResultsSaveResponse> {
  const res = await fetch(`/api/results-cms/${section}`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify({ fields }),
  });
  return res.json();
}

/**
 * PUT /api/results-cms/:section
 * Fully replaces the entire section content.
 */
export async function putResultsSection(
  section: ResultsSectionKey,
  content: Record<string, unknown>,
  token: string | null
): Promise<ResultsSaveResponse> {
  const res = await fetch(`/api/results-cms/${section}`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify({ content }),
  });
  return res.json();
}

/**
 * POST /api/results-cms/seed
 * Seeds/resets all sections to default content.
 */
export async function seedResultsContent(token: string | null): Promise<ResultsSeedResponse> {
  const res = await fetch('/api/results-cms/seed', {
    method: 'POST',
    headers: getHeaders(token),
  });
  return res.json();
}

/**
 * POST /api/results-cms/upload
 * Uploads a media file and returns the CDN URL.
 */
export async function uploadResultsMedia(
  file: File,
  section: ResultsSectionKey,
  token: string | null,
  key?: string,
  oldUrl?: string
): Promise<ResultsUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('section', section);
  if (key) formData.append('key', key);
  if (oldUrl) formData.append('oldUrl', oldUrl);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch('/api/results-cms/upload', {
    method: 'POST',
    headers,
    body: formData,
  });
  return res.json();
}
