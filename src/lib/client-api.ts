'use client';

import { toast } from 'react-toastify';

type ApiFetchOptions = RequestInit & {
  token?: string | null;
  suppressErrorToast?: boolean;
};

export async function apiFetch<T = any>(url: string, options: ApiFetchOptions = {}): Promise<T> {
  const { token, suppressErrorToast, headers, ...rest } = options;
  const mergedHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(headers as Record<string, string> | undefined),
  };
  if (token) mergedHeaders.Authorization = `Bearer ${token}`;
  if (rest.body && !mergedHeaders['Content-Type']) {
    mergedHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...rest,
    headers: mergedHeaders,
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const permissionCode = data?.error?.code;
    const requiredAction = data?.error?.requiredAction;
    const message =
      permissionCode === 'PERMISSION_DENIED'
        ? `Access Denied: You do not have '${requiredAction || 'required'}' permission.`
        : data?.message || data?.error || `Request failed (${response.status})`;

    if (!suppressErrorToast) toast.error(message);
    const err = new Error(message) as Error & { status?: number; payload?: any };
    err.status = response.status;
    err.payload = data;
    throw err;
  }

  return data as T;
}
